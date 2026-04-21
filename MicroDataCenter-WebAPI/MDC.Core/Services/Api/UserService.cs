using MDC.Core.Models;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Graph;
using System.Collections;

namespace MDC.Core.Services.Api;

internal class UserService(IMDCDatabaseService databaseService, GraphServiceClient  graphClient, IOptions<UserServiceOptions> options, ITenantContext tenantContext) : IUserService
{
    public async Task<IEnumerable<User>> EnrichAsync(IEnumerable<User> users, CancellationToken cancellationToken)
    {
        const int batchSize = 20;    // The Microsoft Graph SDK has limit of 20 requests per batch.  See https://learn.microsoft.com/en-us/graph/sdks/batch-requests
        var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, cancellationToken) ?? throw new InvalidOperationException("Unable to fetch Application Registration from Azure AD");

        var userLookup = users
            .Where(i => i.EmailAddress == null)
            .ToLookup(i => i.Id, i => i);

        for (int i = 0; i < userLookup.Count; i += batchSize)
        {
            var batchUsers = userLookup.Skip(i).Take(batchSize).ToArray();
            var batchRequest = new BatchRequestContentCollection(graphClient);
            var requestIds = new Dictionary<string, IGrouping<Guid, User>>();
            foreach (var batchUser in batchUsers)
            {
                var request = graphClient.Users[batchUser.Key.ToString()]
                    .ToGetRequestInformation(rc =>
                    {
                        rc.QueryParameters.Select = ["id", "displayName", "mail"];
                        rc.QueryParameters.Expand = ["AppRoleAssignments"];
                    });
                var requestId = await batchRequest.AddBatchRequestStepAsync(request);
                requestIds[requestId] = batchUser;
            }

            var response = await graphClient.Batch.PostAsync(batchRequest, cancellationToken);

            foreach (var kvp in requestIds)
            {
                var graphUser = await response.GetResponseByIdAsync<Microsoft.Graph.Models.User>(kvp.Key);
                if (graphUser != null)
                {
                    foreach (var user in kvp.Value)
                    {
                        user.DisplayName = graphUser.DisplayName ?? user.Id.ToString();
                        user.EmailAddress = graphUser.Mail;
                        user.AppRoles = (graphUser.AppRoleAssignments ?? throw new InvalidOperationException($"Failed to expand AppRoleAssignments for user with Id {graphUser.Id}"))
                            .Select(a => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.Id == a.AppRoleId))
                            .Where(appRole => appRole != null && appRole.DisplayName != null)
                            .Select(appRole => appRole!.DisplayName!)
                            .ToArray();
                    }
                }
            }
        }
        return users;
    }

    public async Task<IEnumerable<User>> GetAllAsync(bool getUnregisteredUsers, CancellationToken cancellationToken = default)
    {
        var dbUsers = databaseService.GeAlltUsers();
        //if (getUnregisteredUsers)
        //    throw new NotImplementedException("TODO: Fetch the unregistered users");
        //return tenantContext.ApplyTo(dbUsers.Select(DtoProjections.ToUser));


        return await ComputeUsersAsync(dbUsers, getUnregisteredUsers, cancellationToken);
    }



    public async Task<User> CreateAsync(UserRegistrationDescriptor userDescriptor, CancellationToken cancellationToken = default)
    {
        // Validate that the User exists in the Directory
        var graphUser = await graphClient.Users[userDescriptor.Id].GetAsync(i => i.QueryParameters.Expand = ["AppRoleAssignments"], cancellationToken) ?? throw new InvalidOperationException($"Failed to find user in Microsoft Graph with Id {userDescriptor.Id}");
        if (!Guid.TryParse(graphUser.Id, out var id))         
        {
            throw new InvalidOperationException($"Graph User Id {graphUser.Id} is not a valid GUID");
        }
        if (graphUser.UserPrincipalName == null)
        {
            throw new InvalidOperationException($"Graph User with Id {graphUser.Id} has no UserPrincipalName");
        }

        // Validate that ApplicationRoles can be assigned
        userDescriptor.ApplicationRoles ??= [];
        if (userDescriptor.ApplicationRoles.Length > 0 && options.Value.EnterpriseAppObjectId == null)
            throw new InvalidOperationException("Unable to manage Application Roles because Enterprise App Id is not configured");
        
        // Execute the actions
        var dbUser = await databaseService.CreateUserAsync(id, graphUser.UserPrincipalName, userDescriptor.OrganizationRoles, cancellationToken);

        if (userDescriptor.ApplicationRoles.Length > 0)
        {
            var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, cancellationToken) ?? throw new InvalidOperationException("Unable to fetch Application Registration from Azure AD");
            var addAppRoles = userDescriptor.ApplicationRoles.Select(i => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.DisplayName == i) ?? throw new InvalidOperationException($"Application Role {i} is not a valid.")).ToArray();

            foreach (var addAppRole in addAppRoles.ExceptBy(graphUser!.AppRoleAssignments!.Select(i => i.AppRoleId), i => i.Id))
            {
                var assignment = new Microsoft.Graph.Models.AppRoleAssignment()
                {
                    ResourceId = Guid.Parse(options.Value.EnterpriseAppObjectId!),
                    PrincipalId = id,
                    AppRoleId = addAppRole.Id
                };

                var appRemoteAssignment = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].AppRoleAssignedTo.PostAsync(assignment, null, cancellationToken);
            }
        }

        return (await ComputeUsersAsync(new[] { dbUser }.AsQueryable(), false, cancellationToken)).FirstOrDefault() ?? throw new InvalidOperationException($"Failed to fetch newly registered User with Id {userDescriptor.Id}");
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dbUser = await databaseService.GetUserByIdAsync(id, cancellationToken);
        if (dbUser == null) return null;
        return (await ComputeUsersAsync(new[] { dbUser }, false, cancellationToken)).FirstOrDefault();
    }

    public async Task<User> UpdateAsync(Guid id, UserUpdateDescriptor userDescriptor, CancellationToken cancellationToken = default)
    {
        var dbUser = await databaseService.GetUserByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"User with Id {id} not registered");

        userDescriptor.AddOrganizationRoles ??= [];
        userDescriptor.RemoveOrganizationRoles ??= [];

        var organizationOperations = userDescriptor
            .AddOrganizationRoles
            .Select(i => new
            {
                Operation = "add",
                Data = i
            })
            .Concat(userDescriptor.RemoveOrganizationRoles.Select(i => new
            {
                Operation = "remove",
                Data = i
            }))
            .ToLookup(i => i.Data.OrganizationId);

        foreach (var organizationOperation in organizationOperations)
        {
            var dbOrganization = await databaseService.UpdateOrganizationAsync(organizationOperation.Key, null, null, [], [],
                (organizationOperation.Where(i => i.Operation == "add")).Select(i => new OrganizationUserRoleDescriptor
                {
                    Role = i.Data.Role,
                    UserId = id
                }).ToArray(),
                (organizationOperation.Where(i => i.Operation == "remove")).Select(i => new OrganizationUserRoleDescriptor
                {
                    Role = i.Data.Role,
                    UserId = id
                }).ToArray(), 
                cancellationToken);
        }
       
        userDescriptor.RemoveApplicationRoles ??= [];
        userDescriptor.AddApplicationRoles ??= [];

        if (userDescriptor.RemoveApplicationRoles.Length > 0 || userDescriptor.AddApplicationRoles.Length > 0)
        {
            var graphUser = await graphClient.Users[dbUser.Id.ToString()].GetAsync(i => i.QueryParameters.Expand = ["AppRoleAssignments"], cancellationToken) ?? throw new InvalidOperationException($"Failed to find user in Microsoft Graph with Id {dbUser.Id}");

            if (options.Value.EnterpriseAppObjectId == null)
                throw new InvalidOperationException("Unable to manage Application Roles because Enterprise App Id is not configured");

            var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, cancellationToken) ?? throw new InvalidOperationException("Unable to fetch Application Registration from Azure AD");

            var removeAppRoles = userDescriptor.RemoveApplicationRoles.Select(i => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.DisplayName == i) ?? throw new InvalidOperationException($"Application Role {i} is not a valid.")).ToArray();
            var addAppRoles = userDescriptor.AddApplicationRoles.Select(i => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.DisplayName == i) ?? throw new InvalidOperationException($"Application Role {i} is not a valid.")).ToArray();

            foreach (var removeAppRole in removeAppRoles)
            {
                var appRoleAssignment = graphUser.AppRoleAssignments?.FirstOrDefault(i => i.AppRoleId == removeAppRole.Id);
                if (appRoleAssignment == null)
                    continue;

                //var assignment = new Microsoft.Graph.Models.AppRoleAssignment()
                //{
                //    ResourceId = Guid.Parse(options.Value.EnterpriseAppObjectId),
                //    PrincipalId = id,
                //    AppRoleId = appRoleAssignment.Id
                //};

                await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].AppRoleAssignedTo[appRoleAssignment.Id].DeleteAsync(null, cancellationToken);
            }

            foreach (var addAppRole in addAppRoles.ExceptBy(graphUser!.AppRoleAssignments!.Select(i => i.AppRoleId), i => i.Id))
            {
                var assignment = new Microsoft.Graph.Models.AppRoleAssignment()
                {
                    ResourceId = Guid.Parse(options.Value.EnterpriseAppObjectId),
                    PrincipalId = id,
                    AppRoleId = addAppRole.Id
                };

                var appRemoteAssignment = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].AppRoleAssignedTo.PostAsync(assignment, null, cancellationToken);
            }
        }

        return await GetByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Failed to fetch updated User with Id {id}");
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        // Note: Deleting the user does not remove them from Azure AD at this time
        await databaseService.RemoveUserAsync(id, cancellationToken); 
    }

    public async Task<AppRole[]> GetAppRoles(CancellationToken cancellationToken = default)
    {
        var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, cancellationToken) ?? throw new InvalidOperationException("Unable to fetch Application Registration from Azure AD");
        return servicePrincipal.AppRoles?
            .Where(i => i.IsEnabled == true)
            .Select(i => new AppRole
            {
                DisplayName = i.DisplayName!,
                Value = i.Value!,
                Description = i.Description!
            }).ToArray() ?? Array.Empty<AppRole>();
    }

    private async Task<IQueryable<User>> ComputeUsersAsync(IEnumerable<DbUser> dbUsers, bool getUnregisteredUsers, CancellationToken cancellationToken = default)
    {
        var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, cancellationToken) ?? throw new InvalidOperationException("Unable to fetch Application Registration from Azure AD");

        var users = new List<User>();
        var dictDbUsers = dbUsers.ToDictionary(i => i.Id, i => i);

        var page = (await graphClient.Users.GetAsync(i =>
        {
            i.QueryParameters.Select = ["id", "displayName", "mail"];
            i.QueryParameters.Expand = ["AppRoleAssignments"];
            i.QueryParameters.Filter = "creationType eq 'LocalAccount'";
        }, cancellationToken)) ?? throw new InvalidOperationException("Unable to retrieve users from Azure Ad.");
        while (true)
        {
            users.AddRange(page.Value!
                .Select(u =>
                {
                    var existingUser = dictDbUsers.TryGetValue(Guid.Parse(u.Id!), out var dbUser) ? dbUser : null;

                    return new User
                    {
                        Id = Guid.Parse(u.Id!),
                        DisplayName = u.DisplayName ?? u.Id!,
                        EmailAddress = u.Mail,
                        IsRegistered = existingUser != null,
                        OrganizationRoles = (existingUser?.OrganizationUserRoles ?? []).Select(our => new UserOrganizationRole
                        { 
                            OrganizationId = our.OrganizationId,
                            Role = our.Role
                        })
                        .ToArray(),
                        AppRoles = (u.AppRoleAssignments ?? throw new InvalidOperationException($"Failed to expand AppRoleAssignments for user with Id {u.Id}"))
                        .Select(a => servicePrincipal.AppRoles?.FirstOrDefault(appRole => appRole.Id == a.AppRoleId))
                        .Where(appRole => appRole != null && appRole.DisplayName != null)
                        .Select(appRole => appRole!.DisplayName!)
                        .ToArray()
                    };
                })
                .Where(u => tenantContext.IsPrivilegedUser || u.IsRegistered)
                .ToArray()
            );

            if (page.OdataNextLink == null)
                break;

            page = (await graphClient.Users
                .WithUrl(page.OdataNextLink)
                .GetAsync(i =>
                {
                    i.QueryParameters.Select = ["id", "displayName", "mail"];
                    i.QueryParameters.Expand = ["AppRoleAssignments"];
                    i.QueryParameters.Filter = "creationType eq 'LocalAccount'";
                }, cancellationToken)) ?? throw new InvalidOperationException("Unable to retrieve users from Azure Ad.");
        }
        return users
            .Where(i => getUnregisteredUsers ? true : i.IsRegistered)
            .AsQueryable();
    }

    private async Task<Microsoft.Graph.Models.AppRoleAssignment[]> GetAppRoleAssignments(CancellationToken cancellationToken = default)
    {
        if (options.Value.EnterpriseAppObjectId == null)
            throw new InvalidOperationException("Unable to manage Application Roles because Enterprise App Id is not configured");

        var assignments = new List<Microsoft.Graph.Models.AppRoleAssignment>();

        // 1️⃣ Get all assignments (paged)
        var page = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId]
            .AppRoleAssignedTo
            .GetAsync(null, cancellationToken);

        while (true)
        {
            assignments.AddRange(page!.Value!);

            if (page.OdataNextLink == null)
                break;

            page = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId]
                .AppRoleAssignments
                .WithUrl(page.OdataNextLink)
                .GetAsync(null, cancellationToken);
        }

        return assignments.Where(i => i.PrincipalType == "User").ToArray();
    }
}
