using MDC.Core.Models;
using MDC.Core.Services.Providers.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Providers.MDCDatabase;

internal class MDCDatabaseService(MDCDbContext dbContext, ITenantContext tenantContext, ILogger<MDCDatabaseService> logger) : IMDCDatabaseService
{
    // const string DefaultOrganizationName = "Default";

    public async Task<DbSite> CreateSiteAsync(string name, string description, string apiTokenId, string apiSecret, CancellationToken cancellationToken = default)
    {
        //// When creating a site, at least one active organization must be specified
        //if (organizationIds.Length == 0) throw new InvalidOperationException("No organizations are specified for the site.");

        //var dbOrganizations = await dbContext.Organizations.Where(i => i.Active && organizationIds.Contains(i.Id)).ToArrayAsync(cancellationToken);
        //if (dbOrganizations.Length != organizationIds.Length) throw new InvalidOperationException("One or more organizations not found.");

        var site = await dbContext.Sites.FirstOrDefaultAsync(site => site.Name == name, cancellationToken);
        var now = DateTime.UtcNow;
        if (site == null)
        {
            var newSite = await dbContext.Sites.AddAsync(new DbSite
            {
                Name = name,
                Description = description,
                ApiTokenId = apiTokenId,
                ApiSecret = apiSecret,
                CreatedAt = now,
                UpdatedAt = now,
                //Organizations = dbOrganizations
            }, cancellationToken);
            site = newSite.Entity;
        }
        else
        {
            site.Name = name;
            site.Description = description;
            site.ApiTokenId = apiTokenId;
            site.ApiSecret = apiSecret;
            site.UpdatedAt = now;

            //foreach (var dbOrganization in dbOrganizations)
            //{
            //    if (site.Organizations.Contains(dbOrganization))
            //        continue;
            //    site.Organizations.Add(dbOrganization);
            //}
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return site;
    }

    public async Task<DbSite> UpdateSiteAsync(Guid id, string? name, string? description, string? apiTokenId, string? apiSecret, Guid[]? addOrganizationIds, Guid[]? removeOrganizationIds, CancellationToken cancellationToken = default)
    {
        var dbSite = await dbContext.Sites.FindAsync([id], cancellationToken) ?? throw new InvalidOperationException($"Site {id} not found.");
        var now = DateTime.UtcNow;

        if (name != null)
            dbSite.Name = name;

        if (description != null)
            dbSite.Description = description;

        if (apiTokenId != null)
            dbSite.ApiTokenId = apiTokenId;

        if (apiSecret != null)
            dbSite.ApiSecret = apiSecret;

        // Check that the Organizations being removed are all already assigned
        removeOrganizationIds ??= [];
        var organizationsToRemove = dbSite.Organizations.IntersectBy(removeOrganizationIds, i => i.Id).ToList();
        if (organizationsToRemove.Count != removeOrganizationIds.Length) throw new InvalidOperationException("Cannot remove Organizations which are not assigned to Site");

        // Check that the Organizations being added are not already added
        addOrganizationIds ??= [];
        var organizationIdsToAdd = addOrganizationIds.Except(dbSite.Organizations.Select(i => i.Id)).ToList();
        if (organizationIdsToAdd.Count != addOrganizationIds.Length) throw new InvalidOperationException("Cannot add Organizations which are already assigned to Site");

        foreach (var organization in organizationsToRemove)
        {
            dbSite.Organizations.Remove(organization);
        }

        foreach (var organizationId in organizationIdsToAdd)
        {
            var organization = await dbContext.Organizations.FindAsync([organizationId], cancellationToken) ?? throw new InvalidOperationException($"Site Id '{organizationId}' not found.");
            dbSite.Organizations.Add(organization);
        }

        dbSite.UpdatedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);
        return dbSite;
    }

    public async Task<DbSiteNode> CreateSiteNodeAsync(Guid siteId, Guid machineId, string memberAddress, string name, string serialNumber, int apiPort, bool apiValidateServerCertificate, CancellationToken cancellationToken = default)
    {
        var siteNode = await dbContext.SiteNodes.FirstOrDefaultAsync(siteNode => siteNode.SerialNumber == serialNumber, cancellationToken);
        var now = DateTime.UtcNow;
        if (siteNode == null)
        {
            var newSiteNode = await dbContext.SiteNodes.AddAsync(new DbSiteNode
            {
                Id = Guid.NewGuid(),
                Name = name,
                MachineId = machineId,
                SerialNumber = serialNumber,
                MemberAddress = memberAddress,
                ApiPort = apiPort,
                ApiValidateServerCertificate = apiValidateServerCertificate,
                CreatedAt = now,
                UpdatedAt = now,
                SiteId = siteId
            }, cancellationToken);
            siteNode = newSiteNode.Entity;
        }
        else
        {
            siteNode.Name = name;
            siteNode.SerialNumber = serialNumber;
            siteNode.MemberAddress = memberAddress;
            siteNode.ApiPort = apiPort;
            siteNode.ApiValidateServerCertificate = apiValidateServerCertificate;
            siteNode.UpdatedAt = now;
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return siteNode;
    }

    //public async Task<DbSite?> GetSiteByClusterNameAsync(string clusterName, CancellationToken cancellationToken = default)
    //{
    //    return await dbContext.Sites
    //        .Where(i => i.Name == name)
    //        .Include(i => i.SiteNodes)
    //        .Include(i => i.Workspaces)
    //        .Include(i => i.Organizations)
    //        .AsNoTracking()
    //        .FirstOrDefaultAsync(cancellationToken);
    //}

    public async Task<DbSite?> FindSiteAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Sites
            .Include(i => i.Workspaces)
            .Include(i => i.Organizations)
            .Include(i => i.SiteNodes)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == siteId, cancellationToken);
    }

    public IQueryable<DbSite> GetAllSites()
    {
        return dbContext.Sites.AsSplitQuery().AsNoTracking();
    }

    public IQueryable<DbSiteNode> GetAllSitesNodes()
    {
        return dbContext.SiteNodes.AsNoTracking();
    }

    public async Task<DbSiteNode?> GetSiteNodeAsync(string memberAddress, CancellationToken cancellationToken = default)
    {
        return await dbContext.SiteNodes
            .Include(i => i.Site)
            .Where(i => i.MemberAddress == memberAddress)
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task DeleteSiteNodeAsync(Guid siteNodeId, CancellationToken cancellationToken = default)
    {
        using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        try
        {
            var siteNode = await dbContext.SiteNodes.FirstOrDefaultAsync(i => i.Id == siteNodeId, cancellationToken) ?? throw new InvalidOperationException($"Site Node Id '{siteNodeId}' not found.");

            var siteNodeRegistrations = await dbContext.SiteNodeRegistrations.Where(i => i.SiteNodeId == siteNode.Id).ToArrayAsync(cancellationToken);
            dbContext.RemoveRange(siteNodeRegistrations);
            await dbContext.SaveChangesAsync(cancellationToken);

            dbContext.Remove(siteNode);

            await dbContext.SaveChangesAsync(cancellationToken);

            var site = await dbContext.Sites.FindAsync(siteNode.SiteId, cancellationToken) ?? throw new InvalidOperationException($"Site Id '{siteNode.SiteId}' not found.");

            // site.SiteNodes.Remove(siteNode);

            if (site.SiteNodes.Count == 0)
            {
                logger.LogWarning("Site '{siteId}' has no remaining Site Nodes after deletion of Site Node with Member Address '{memberAddress}'.  Site will be deleted.", site.Id, siteNode.MemberAddress);
                dbContext.Remove(site);
            }
            else
            {
                site.UpdatedAt = DateTime.UtcNow;
                dbContext.Sites.Update(site);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation("Deleted Site Node Id '{siteNodeId}'.", siteNodeId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error deleting Site Node Id '{siteNodeId}'.", siteNodeId);
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<DbWorkspace[]> ImportWorkspacesAsync(Guid siteId, Guid organizationId, IEnumerable<WorkspaceEntry> workspaceEntries, CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.Workspaces
            .Where(i => i.SiteId == siteId)
            .Select(i => i.Address)
            .ToArrayAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var dbWorkspaces = workspaceEntries
            .Where(entry => entry.DbWorkspace == null && entry.Address != 0 && !string.IsNullOrEmpty(entry.Name) && !existing.Contains(entry.Address))
            .Select(entry => entry.DbWorkspace = new DbWorkspace
            {
                OrganizationId = organizationId,
                SiteId = siteId,
                Address = entry.Address,
                Name = entry.Name,
                Description = string.Empty,
                CreatedAt = now,
                UpdatedAt = now,
                Status = null,
                Locked = entry.Locked,
                IsDeleted = false
            })
            .ToArray();

        if (dbWorkspaces.Length == 0) return Array.Empty<DbWorkspace>();

        logger.LogInformation("Adding {importWorkspacesCount} New Workspaces to database for Side Id '{siteId}', Organization Id '{organizationId}'.", dbWorkspaces.Length, siteId, organizationId);
        await dbContext.Workspaces.AddRangeAsync(dbWorkspaces, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return dbWorkspaces.ToArray();
    }

    public async Task<DbVirtualNetwork[]> ImportVirtualNetworksAsync(IEnumerable<WorkspaceEntry> workspaceEntries, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var dbVirtualNetworks = workspaceEntries.Where(i => i.DbWorkspace != null)
            .SelectMany(we => we.VirtualNetworks.Where(i => i.DbVirtualNetwork == null && i.Index.HasValue && i.Name != null && i.Tag.HasValue),
                (we, vn) => new
                {
                    WorkspaceEntry = we,
                    VirtualNetworkEntry = vn
                }
            )
            .Select(i =>
                i.VirtualNetworkEntry.DbVirtualNetwork = new DbVirtualNetwork
                {
                    WorkspaceId = i.WorkspaceEntry.DbWorkspace!.Id,
                    Index = i.VirtualNetworkEntry.Index!.Value,
                    Name = i.VirtualNetworkEntry.Name!,
                    Tag = i.VirtualNetworkEntry.Tag!.Value,
                    CreatedAt = now,
                    UpdatedAt = now,
                    ZeroTierNetworkId = null
                }
            )
            .ToArray();

        var existing = await dbContext.VirtualNetworks
            .Where(i => dbVirtualNetworks.Select(vn => vn.WorkspaceId).Contains(i.WorkspaceId))
            .Select(i => new { i.WorkspaceId, i.Tag })
            .ToListAsync(cancellationToken);

        var updateDbVirtualNetworks = dbVirtualNetworks
            .Where(vn => !existing.Any(e => e.WorkspaceId == vn.WorkspaceId && e.Tag == vn.Tag))
            .ToArray();

        if (updateDbVirtualNetworks.Length == 0) return Array.Empty<DbVirtualNetwork>();

        logger.LogInformation("Adding {importVirtualNetworkCount} New Virtual Networks to database.", dbVirtualNetworks.Length);
        await dbContext.VirtualNetworks.AddRangeAsync(updateDbVirtualNetworks, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return dbVirtualNetworks;
    }

    public async Task<DbWorkspace?> GetWorkspaceByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.Workspaces
            .Include(i => i.Site)
            .ThenInclude(i => i.SiteNodes)
            .Include(i => i.Organization)
            .Include(i => i.VirtualNetworks)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public IQueryable<DbWorkspace> GetAllWorkspaces()
    {
        return dbContext.Workspaces.AsSplitQuery().AsNoTracking();
    }

    public async Task<DbWorkspace> CreateWorkspaceAsync(Guid siteId, Guid organizationId, string workspaceName, string? description, string[] virtualNetworkNames, DatacenterSettings datacenterSettings, CancellationToken cancellationToken = default)
    {
        var dbSite = await FindSiteAsync(siteId, cancellationToken) ?? throw new InvalidOperationException("Site not found.");

        //var dbOrganization = organizationId == null 
        //    ? await GetDefaultOrganizationAsync(dbSite, cancellationToken)
        //    : await dbContext.Organizations.FindAsync([organizationId], cancellationToken) ?? throw new InvalidOperationException($"Organization '{organizationId}' not found.");

        var dbOrganization = await dbContext.Organizations.FindAsync([organizationId], cancellationToken) ?? throw new InvalidOperationException($"Organization '{organizationId}' not found.");

        if (!dbSite.Organizations.Select(i => i.Id).Contains(dbOrganization.Id)) throw new InvalidOperationException("Organization is not a member of Site.");

        using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        try
        {
            // Compute Next Available Address
            var exisingAddresses = await dbContext
                .Workspaces
                .AsNoTracking()
                // .IgnoreQueryFilters()    -- Don't filter out the soft-delete Workspaces
                .Where(i => i.SiteId == siteId)
                .Select(i => i.Address)
                .ToArrayAsync(cancellationToken);
            if (exisingAddresses.Length >= (9999 - datacenterSettings.MinWorkspaceAddress)) throw new InvalidOperationException("Unable to create new Workspace.  Maximum number of Workspaces has been reached.");

            // Compute Next Available Virtual Network Tag
            var existingTags = await dbContext
                .VirtualNetworks
                .AsNoTracking()
                // .IgnoreQueryFilters()    -- Don't filter out the soft-delete Workspaces
                .Where(i => i.Workspace!.SiteId == siteId)
                .Select(i => i.Tag)
                .ToListAsync(cancellationToken);
            if (existingTags.Count >= (4096 - datacenterSettings.MinVirtualNetworkTag - virtualNetworkNames.Length)) throw new InvalidOperationException("Unable to create new Workspace.  Maximum number of Virtual Networks has been reached.");

            var now = DateTime.UtcNow;
            var dbWorkspace = new DbWorkspace
            {
                OrganizationId = dbOrganization.Id,
                SiteId = siteId,
                Address = Enumerable.Range(datacenterSettings.MinWorkspaceAddress, exisingAddresses.Length + 1).Except(exisingAddresses).First(),  // The lowest Address available
                Name = workspaceName,
                Description = description,
                CreatedAt = now,
                UpdatedAt = now,
                Status = "Creating",
                Locked = false,
                IsDeleted = false
            };
            var newWorkspace = await dbContext.Workspaces.AddAsync(dbWorkspace, cancellationToken);

            for (int index = 0; index < virtualNetworkNames.Length; index++)
            {
                var dbVirtualNetwork = new DbVirtualNetwork
                {
                    Index = index,
                    Tag = Enumerable.Range(datacenterSettings.MinVirtualNetworkTag, existingTags.Count + 1).Except(existingTags).First(),  // The lowest Address Tag
                    Name = virtualNetworkNames[index],
                    CreatedAt = now,
                    UpdatedAt = now,
                    WorkspaceId = newWorkspace.Entity.Id,
                    Workspace = newWorkspace.Entity,
                    ZeroTierNetworkId = null
                };
                var newVirtualNetwork = await dbContext.VirtualNetworks.AddAsync(dbVirtualNetwork, cancellationToken);
                existingTags.Add(dbVirtualNetwork.Tag);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return newWorkspace.Entity;
        }
        catch (Exception)
        {
            // TODO: Log this exception
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<DbWorkspace> UpdateWorkspaceAsync(DatacenterEntry datacenterEntry, Guid workspaceId, WorkspaceDescriptor workspaceDescriptor, CancellationToken cancellationToken = default)
    {
        if (!dbContext.Workspaces.Any(w => w.Id == workspaceId))
            throw new InvalidOperationException($"Workspace '{workspaceId}' not found.");

        using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        try
        {
            var dbWorkspace = await dbContext.Workspaces
                .Include(i => i.VirtualNetworks)
                .FirstOrDefaultAsync(i => i.Id == workspaceId && i.SiteId == datacenterEntry.DbSite.Id, cancellationToken)
                ?? throw new InvalidOperationException($"Workspace '{workspaceId}' not found.");

            var now = DateTime.UtcNow;

            if (dbWorkspace.Name != workspaceDescriptor.Name)
            {
                dbWorkspace.Name = workspaceDescriptor.Name;
                dbWorkspace.UpdatedAt = now;
            }

            // First, process all of the Virtual Network deletions
            foreach (var virtualNetworkDescriptor in (workspaceDescriptor.VirtualNetworks ?? []).Where(i => i.Operation == VirtualNetworkDescriptorOperation.Remove))
            {
                var dbVirtualNetwork = dbWorkspace.VirtualNetworks.FirstOrDefault(i => i.Name == virtualNetworkDescriptor.Name);     // Note that the Virtual Networks within a Workspace must have unique names
                if (dbVirtualNetwork == null) continue; // A name was specified that does not exist, so just ignore it

                dbContext.Remove(dbVirtualNetwork);
            }

            // Save changes if any
            if (dbContext.ChangeTracker.HasChanges())
            {
                await dbContext.SaveChangesAsync(cancellationToken);

                dbWorkspace = await dbContext.Workspaces
                    .Include(i => i.VirtualNetworks)
                    .FirstOrDefaultAsync(i => i.Id == workspaceId && i.SiteId == datacenterEntry.DbSite.Id, cancellationToken)
                    ?? throw new InvalidOperationException($"Workspace '{workspaceId}' not found.");

            }

            // Next, process all of the Virtual Network additions
            var addVirtualNetworkDescriptors = (workspaceDescriptor.VirtualNetworks ?? []).Where(i => i.Operation == VirtualNetworkDescriptorOperation.Add).ToArray() ?? [];
            if (addVirtualNetworkDescriptors.Length > 0)
            {
                var existingTags = await dbContext
                    .VirtualNetworks
                    .AsNoTracking()
                    // .IgnoreQueryFilters()    -- Don't filter out the soft-delete Workspaces
                    .Where(i => i.Workspace!.SiteId == datacenterEntry.DbSite.Id)
                    .Select(i => i.Tag)
                    .ToListAsync(cancellationToken);
                if (existingTags.Count >= (4096 - datacenterEntry.DatacenterSettings.MinVirtualNetworkTag - addVirtualNetworkDescriptors.Length)) throw new InvalidOperationException("Unable to create new Virtual Networks.  Maximum number of Virtual Networks has been reached.");

                var startIndex = dbWorkspace.VirtualNetworks.Count == 0 ? 0 : dbWorkspace.VirtualNetworks.Select(i => i.Index).Max() + 1;
                for (int index = startIndex; index < (startIndex + addVirtualNetworkDescriptors.Length); index++)
                {
                    var dbVirtualNetwork = new DbVirtualNetwork
                    {
                        Index = index,
                        Tag = Enumerable.Range(datacenterEntry.DatacenterSettings.MinVirtualNetworkTag, existingTags.Count + 1).Except(existingTags).First(),  // The lowest Address Tag
                        Name = addVirtualNetworkDescriptors[index - startIndex].Name!,
                        CreatedAt = now,
                        UpdatedAt = now,
                        WorkspaceId = dbWorkspace.Id,
                        Workspace = dbWorkspace,
                        ZeroTierNetworkId = null
                    };
                    var newVirtualNetwork = await dbContext.VirtualNetworks.AddAsync(dbVirtualNetwork, cancellationToken);
                    existingTags.Add(dbVirtualNetwork.Tag);
                }
            }

            // Finally, process all of the Virtual Network updates
            foreach (var virtualNetworkDescriptor in (workspaceDescriptor.VirtualNetworks ?? []).Where(i => i.Operation == VirtualNetworkDescriptorOperation.Update))
            {
                var dbVirtualNetwork = dbWorkspace.VirtualNetworks.FirstOrDefault(i => i.Name == virtualNetworkDescriptor.Name) ?? throw new InvalidOperationException($"Virtual Network '{virtualNetworkDescriptor.Name}' not found in database for Workspace '{workspaceId}'.");

                // TODO: Update the ZeroTierNetworkId if it has changed
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return dbWorkspace;
        }
        catch (Exception)
        {
            // TODO: Log this exception
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<int> DeleteWorkspaceAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        var dbWorkspace = await dbContext.Workspaces.FindAsync(workspaceId, cancellationToken) ?? throw new InvalidOperationException($"Unable to find Workspace id {workspaceId}");
        dbWorkspace.IsDeleted = true;
        dbWorkspace.UpdatedAt = DateTime.UtcNow;
        var rows = await dbContext.SaveChangesAsync(cancellationToken);
        return rows;
    }

    public async Task SetWorkspaceLockAsync(Guid workspaceId, bool locked, CancellationToken cancellationToken = default)
    {
        var dbWorkspace = await dbContext.Workspaces.FindAsync(workspaceId, cancellationToken) ?? throw new InvalidOperationException($"Unable to find Workspace id {workspaceId}");
        dbWorkspace.Locked = locked;
        dbWorkspace.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<DbVirtualNetwork> UpdateVirtualNetworkAsync(Guid virtualNetworkId, CancellationToken cancellationToken = default)
    {
        var dbVirtualNetwork = await dbContext.VirtualNetworks.FindAsync(virtualNetworkId, cancellationToken) ?? throw new InvalidOperationException($"Unable to find Virtual Network id {virtualNetworkId}");
        dbVirtualNetwork.UpdatedAt = DateTime.UtcNow;
        dbContext.VirtualNetworks.Update(dbVirtualNetwork);
        await dbContext.SaveChangesAsync(cancellationToken);
        return dbVirtualNetwork;
    }

    public IQueryable<DbUser> GeAlltUsers()
    {
        var query = tenantContext.IsPrivilegedUser
            ? dbContext // Get Activity Log from all users
                .Users
                .AsSplitQuery()
                .Include(i => i.OrganizationUserRoles)
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(user => user.Active)
            : dbContext // Get Activity Log form users within my organizations
                .Users
                .AsSplitQuery()
                .Include(i => i.OrganizationUserRoles)
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(user => user.Active && user.Id == tenantContext.ObjectId)
                .SelectMany(user => user.OrganizationUserRoles.Select(our => our.Organization!))
                .Distinct()
                .SelectMany(org => org!.OrganizationUserRoles.Select(our => our.User!))
                .Distinct();
        return query;

        //if (!tenantContext.IsAuthenticated)
        //    return Array.Empty<DbUser>().AsQueryable();

        //// Special case where GlobalQueryFilter is ignored so that other users within an organization can be fetched
        //var users = dbContext
        //    .Users
        //    .IgnoreQueryFilters();

        //if (!tenantContext.IsPrivilegedUser)    // Join the authenticated user's Organization membership with all user other user's Organization membership
        //    return users
        //        .Include(user => user.OrganizationUserRoles)
        //        .ThenInclude(i => i.Organization)
        //        .AsNoTracking()
        //        .Where(user => user.Active && user.Id == tenantContext.ObjectId)
        //        .SelectMany(user => user.OrganizationUserRoles) // Outer collection of OrganizationUserRoles for the current user
        //        .LeftJoin(   
        //            users.Where(user => user.Active).SelectMany(tenantUser => tenantUser.OrganizationUserRoles),    // Inner collection of OrganizationUserRoles for all users
        //            our => our.OrganizationId,   // Select Outer collection's OrganizationId
        //            tenantOur => tenantOur.OrganizationId,   // Select inner collection's OrganizationId
        //            (our, tenantOur) => tenantOur!.User!);    // Result selector of joined User

        //return users
        //    .Where(user => user.Active)
        //    .Include(i => i.OrganizationUserRoles)
        //    .ThenInclude(i => i.Organization)
        //    .AsNoTracking();
        //    // .ToArrayAsync(cancellationToken);
    }

    public IQueryable<DbActivityLog> GetAllActivityLogs()
    {
        var query = tenantContext.IsPrivilegedUser
            ? dbContext // Get Activity Log from all users
                .Users
                .IgnoreQueryFilters()
                .AsSplitQuery()
                .AsNoTracking()
                .Where(user => user.Active)
                .SelectMany(u => u.Activities)
            : dbContext // Get Activity Log form users within my organizations
                .Users
                .IgnoreQueryFilters()
                .AsSplitQuery()
                .AsNoTracking()
                .Where(user => user.Active && user.Id == tenantContext.ObjectId)
                .SelectMany(user => user.OrganizationUserRoles.Select(our => our.Organization))
                .Distinct()
                .SelectMany(org => org!.OrganizationUserRoles.Select(our => our.User))
                .Distinct()
                .SelectMany(user => user!.Activities);
        return query;
        // return tenantContext.ApplyTo<ActivityLog, DbActivityLog>(query);

        //if (tenantContext.IsPrivilegedUser)
        //    return dbContext
        //        .ActivityLog
        //        .Include(i => i.User)
        //        .IgnoreQueryFilters()
        //        .AsNoTracking();

        //return (await GetUsersAsync(cancellationToken))
        //    .SelectMany(u => u.Activities)
        //    .AsNoTracking();
    }

    public async Task<DbUser?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.Users
            .Where(user => user.Active)
            .Include(i => i.OrganizationUserRoles)
            .ThenInclude(i => i.Organization)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Active && i.Id == id, cancellationToken);
    }

    public async Task<DbUser> CreateUserAsync(Guid id, string name, UserOrganizationRole[]? userOrganizationRoles, CancellationToken cancellationToken = default)
    {
        // TODO: Validate that userOrganizationRoles are valid
        userOrganizationRoles ??= [];

        // Update user and organizations within a database transaction
        using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        try
        {
            var user = await dbContext.Users.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

            var now = DateTime.UtcNow;
            if (user != null)
            {
                // Reactivate the existing user
                user.Name = name;
                user.UpdatedAt = now;
                user.Active = true;
            }
            else
            {
                var newUser = await dbContext.Users.AddAsync(new DbUser
                {
                    Id = id,
                    Name = name,
                    Active = true,
                    CreatedAt = now,
                    UpdatedAt = now
                }, cancellationToken);
                user = newUser.Entity;
                // Special case: When inserting self record, save then update - the ActivityLog cannot reference itself as user when inserting because the FK record has not been created yet.  The Update will handle the Audit log
                if (tenantContext.ObjectId != null && tenantContext.ObjectId.Value == id)
                {
                    await dbContext.SaveChangesAsync(cancellationToken);    // Insert
                    newUser.Entity.UpdatedAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync(cancellationToken);    // Update
                }
            }

            var existing = await dbContext.OrganizationUserRoles.IgnoreQueryFilters().Where(i => i.UserId == id).ToArrayAsync(cancellationToken);
            foreach (var our in userOrganizationRoles)
            {
                var match = existing.FirstOrDefault(i => i.OrganizationId == our.OrganizationId && i.Role == our.Role);
                if (match != null)
                {
                    match.IsDeleted = false;
                    match.UpdatedAt = now;
                }
                else
                {
                    await dbContext.OrganizationUserRoles.AddAsync(new DbOrganizationUserRole
                    {
                        UserId = id,
                        OrganizationId = our.OrganizationId,
                        Role = our.Role,
                        CreatedAt = now,
                        UpdatedAt = now,
                        IsDeleted = false
                    }, cancellationToken);
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation("User '{userId}' created", id);
            return user;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unable to Create user '{userId}'", id);
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
    public async Task<bool> RemoveUserAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = await dbContext
                .Users
                .FirstOrDefaultAsync(i => i.Id == id && i.Active, cancellationToken) ?? throw new InvalidOperationException($"User Id '{id}' not found.");

            var now = DateTime.UtcNow;
            user.Active = false;
            user.UpdatedAt = now;

            foreach (var our in dbContext.OrganizationUserRoles.Where(i => i.UserId == id))
            {
                our.UpdatedAt = now;
                our.IsDeleted = true;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation("Removed user '{userId}'", id);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unable to Remove user '{userId}'", id);
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    #region Organizations
    public IQueryable<DbOrganization> GetAllOrganizations()
    {
        return dbContext.Organizations.AsSplitQuery().AsNoTracking();
    }

    public async Task<DbOrganization?> GetOrganizationByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.Organizations
            .Include(i => i.OrganizationUserRoles.Where(j => j.User!.Active))
            .ThenInclude(i => i.User)
            .Include(i => i.Sites)
            .Include(i => i.Workspaces)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<DbOrganization[]> GetOrganizationsByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        return await dbContext.Organizations
            .Include(i => i.OrganizationUserRoles.Where(j => j.User!.Active))
            .Include(i => i.Sites)
            .Include(i => i.Workspaces)
            .Where(i => i.Name == name)
            .AsNoTracking()
            .ToArrayAsync(cancellationToken);
    }

    public async Task<DbOrganization> CreateOrganizationAsync(OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default)
    {
        if (!tenantContext.IsPrivilegedUser) throw new UnauthorizedAccessException("User is not permitted to create Organizations.");

        using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Ensure that all of the Sites and Users are valid
            organizationDescriptor.SiteIds ??= [];
            var sites = organizationDescriptor.SiteIds.Length > 0 ? (await dbContext.Sites.Where(i => organizationDescriptor.SiteIds.Contains(i.Id)).ToListAsync(cancellationToken)) : new List<DbSite>();
            if (sites.Count != organizationDescriptor.SiteIds.Length) throw new InvalidOperationException($"Site Id Not found: '{string.Join(',', organizationDescriptor.SiteIds.Except(sites.Select(i => i.Id)))}'");

            organizationDescriptor.OrganizationUserRoles ??= [];
            var organizationUserRole_UserIds = organizationDescriptor.OrganizationUserRoles.Select(i => i.UserId).Distinct().ToList();

            var users = organizationDescriptor.OrganizationUserRoles.Length > 0 ? (await dbContext.Users.Where(i => i.Active && organizationUserRole_UserIds.Contains(i.Id)).ToListAsync(cancellationToken)) : new List<DbUser>();
            //if (users.Count == 0) throw new InvalidOperationException($"Organization must have at least one User Role Assignment");
            if (users.Count != organizationUserRole_UserIds.Count) throw new InvalidOperationException($"User Id Not found: '{string.Join(',', organizationUserRole_UserIds.Except(users.Select(i => i.Id)))}'");


            var now = DateTime.UtcNow;
            var organization = await dbContext.Organizations.AddAsync(new DbOrganization
            {
                Name = organizationDescriptor.Name,
                Description = organizationDescriptor.Description ?? string.Empty,
                Active = true,
                CreatedAt = now,
                UpdatedAt = now,
                Sites = sites,
                OrganizationUserRoles = new List<DbOrganizationUserRole>()
            }, cancellationToken);

            await dbContext.SaveChangesAsync(cancellationToken);

            if (organizationDescriptor.OrganizationUserRoles.Length > 0)
            {
                var organizationUserRoles = organizationDescriptor.OrganizationUserRoles.Select(i => new DbOrganizationUserRole
                {
                    CreatedAt = now,
                    UpdatedAt = now,
                    OrganizationId = organization.Entity.Id,
                    Role = i.Role,
                    UserId = i.UserId,
                    IsDeleted = false
                }).ToArray();
                await dbContext.OrganizationUserRoles.AddRangeAsync(organizationUserRoles, cancellationToken);

                await dbContext.SaveChangesAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return organization.Entity;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unable to create Organization '{organizationName}'", organizationDescriptor.Name);
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<DbOrganization> UpdateOrganizationAsync(Guid id, string? name, string? description, Guid[] addSiteIds, Guid[] removeSiteIds, OrganizationUserRoleDescriptor[] addUsers, OrganizationUserRoleDescriptor[] removeUsers, CancellationToken cancellationToken = default)
    {
        // if (name == DefaultOrganizationName) throw new InvalidOperationException($"Cannot change Organization name with the default Organization Name: '{DefaultOrganizationName}'");

        var dbOrganization = await dbContext
            .Organizations
            .Include(i => i.Sites)
            .FirstOrDefaultAsync(i => i.Id == id && i.Active, cancellationToken) ?? throw new InvalidOperationException($"Organization Id '{id}' not found.");

        // Check that the sites being removed are all already assigned
        var sitesToRemove = dbOrganization.Sites.IntersectBy(removeSiteIds, i => i.Id).ToList();
        if (sitesToRemove.Count != removeSiteIds.Length) throw new InvalidOperationException("Cannot remove sites which are not assigned to Organization");

        // Check that the sites being added are not already added
        var sitesIdsToAdd = addSiteIds.Except(dbOrganization.Sites.Select(i => i.Id)).ToList();
        if (sitesIdsToAdd.Count != addSiteIds.Length) throw new InvalidOperationException("Cannot add sites which are already assigned to Organization");

        // Check that the users being added exist
        var uniqueUsers = addUsers.Select(i => i.UserId).Distinct().ToArray();
        var existingUsers = await dbContext.Users.Where(i => uniqueUsers.Contains(i.Id)).ToListAsync(cancellationToken);
        if (uniqueUsers.Length != existingUsers.Count) throw new InvalidOperationException("Cannot assign users which don't exist");

        // Check that the users being removed are all already assigned
        var usersToRemove = dbOrganization.OrganizationUserRoles.IntersectBy(removeUsers.Select(i => new { i.UserId, i.Role }), i => new { i.UserId, i.Role }).ToList();
        if (usersToRemove.Count != removeUsers.Length) throw new InvalidOperationException("Cannot remove user roles which are not members of Organization");

        // Check that the users being added are not already added
        var usersToAdd = addUsers.ExceptBy(dbOrganization.OrganizationUserRoles.Select(i => new { i.UserId, i.Role }), i => new { i.UserId, i.Role }).ToList();
        if (usersToAdd.Count != addUsers.Length) throw new InvalidOperationException("Cannot add users roles which are already members of Organization");

        var now = DateTime.UtcNow;
        if (name != null) dbOrganization.Name = name;
        if (description != null) dbOrganization.Description = description;
        dbOrganization.UpdatedAt = now;

        foreach (var site in sitesToRemove)
        {
            dbOrganization.Sites.Remove(site);
        }

        foreach (var siteId in sitesIdsToAdd)
        {
            var site = await dbContext.Sites.FindAsync([siteId], cancellationToken) ?? throw new InvalidOperationException($"Site Id '{siteId}' not found.");
            dbOrganization.Sites.Add(site);
        }

        foreach (var user in usersToRemove)
        {
            dbOrganization.OrganizationUserRoles.Remove(user);
        }

        foreach (var user in usersToAdd)
        {
            dbContext.OrganizationUserRoles.Add(new DbOrganizationUserRole
            {
                OrganizationId = id,
                UserId = user.UserId,
                Role = user.Role,
                CreatedAt = now,
                UpdatedAt = now,
                IsDeleted = false
            });
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        return dbOrganization;
    }

    public async Task<bool> RemoveOrganizationAsync(Guid id, CancellationToken cancellationToken = default)
    {
        // Cannot remove an Organization that has Workspaces
        bool hasWorkspaces = await dbContext.Workspaces.AnyAsync(w => w.OrganizationId == id, cancellationToken);
        if (hasWorkspaces)
            throw new InvalidOperationException($"Remove all Workspaces from Organization Id '{id}' before removing Organization.");

        using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var now = DateTime.UtcNow;
            var organization = await dbContext.Organizations.FindAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Organization Id '{id}' not found.");
            foreach (var organizationUserRole in organization.OrganizationUserRoles)
            {
                organizationUserRole.UpdatedAt = now;
                organizationUserRole.IsDeleted = true;
            }
            organization.UpdatedAt = now;
            organization.Active = false;

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error removing Organization Id '{organizationId}'.", id);
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
    #endregion

    //public async Task<DbVirtualNetwork?> GetVirtualNetworkByRemoteNetworkIdAsync(string id, CancellationToken cancellationToken = default)
    //{
    //    return await dbContext.VirtualNetworks
    //        .Include(i => i.Workspace)
    //        .AsNoTracking()
    //        .FirstOrDefaultAsync(i => i.ZeroTierNetworkId == id, cancellationToken);
    //}

    public IQueryable<DbSiteNodeRegistration> GetSiteNodeRegistrations()
    {
        return dbContext.SiteNodeRegistrations.AsSplitQuery().AsNoTracking();
    }

    public async Task<DbSiteNodeRegistration?> GetSiteNodeRegistrationByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.SiteNodeRegistrations
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<DbSiteNodeRegistration> CreateSiteNodeRegistrationAsync(Guid uuid, JsonNode systemInformation, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var dbSiteNodeRegistration = await dbContext.SiteNodeRegistrations.FirstOrDefaultAsync(i => i.UUID == uuid, cancellationToken);
        if (dbSiteNodeRegistration == null)
        {
            var entity = await dbContext.SiteNodeRegistrations.AddAsync(new DbSiteNodeRegistration
            {
                UUID = uuid,
                SystemInfo = systemInformation.ToJsonString(),
                SerialNumber = systemInformation["dmi"]?["system"]?["serial"]?.GetValue<string>() ?? string.Empty,
                CreatedAt = now,
            }, cancellationToken);

            dbSiteNodeRegistration = entity.Entity;
        }

        dbSiteNodeRegistration.CreatedAt = now;
        dbSiteNodeRegistration.SystemInfo = systemInformation.ToJsonString();

        // Reset the CompletedAt and MemberAddress.  Note: this does trust the un-authenticated call to RequestAutoInstallationAsync because it basically can remove the association of the site registration with the same device which is already registered
        dbSiteNodeRegistration.CompletedAt = null;
        dbSiteNodeRegistration.MemberAddress = null;

        await dbContext.SaveChangesAsync(cancellationToken);
        return dbSiteNodeRegistration;
    }

    public async Task<DbSiteNodeRegistration> UpdateSiteNodeRegistrationAsync(Guid uuid, JsonNode? deviceInformation, string? memberAddress, bool complete, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var dbSiteNodeRegistration = await dbContext.SiteNodeRegistrations.Include(i => i.SiteNode).FirstOrDefaultAsync(i => i.UUID == uuid, cancellationToken) ?? throw new InvalidOperationException($"Site Node Registration for UUID '{uuid}' not found.");

        if (deviceInformation != null)
            dbSiteNodeRegistration.DeviceInfo = deviceInformation.ToJsonString();

        if (memberAddress != null)
            dbSiteNodeRegistration.MemberAddress = memberAddress;

        if (complete)
            dbSiteNodeRegistration.CompletedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);
        return dbSiteNodeRegistration;
    }

    public async Task<DbSiteNodeRegistration> AssignSiteNodeRegistrationAsync(Guid registrationId, Guid siteNodeId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var dbSiteNodeRegistration = await dbContext.SiteNodeRegistrations.Include(i => i.SiteNode).FirstOrDefaultAsync(i => i.Id == registrationId, cancellationToken) ?? throw new InvalidOperationException($"Site Node Registration for Id '{registrationId}' not found.");
        dbSiteNodeRegistration.SiteNodeId = siteNodeId;
        await dbContext.SaveChangesAsync(cancellationToken);
        return dbSiteNodeRegistration;
    }

    public async Task DeleteSiteNodeRegistrationAsync(Guid id, CancellationToken cancellationToken = default)
    {
        // Don't fail if the id is not found
        var dbSiteNodeRegistration = await dbContext.SiteNodeRegistrations.FirstOrDefaultAsync(i => i.Id == id, cancellationToken); // ?? throw new InvalidOperationException($"Site Node Registration Id '{id}' not found.");
        if (dbSiteNodeRegistration != null)
        {
            dbContext.SiteNodeRegistrations.Remove(dbSiteNodeRegistration);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<Dictionary<Guid, DbSiteNodeRegistration>> GetSiteNodeRegistrationsForSiteAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        return (await dbContext
            .SiteNodeRegistrations
            .AsNoTracking()
            .Where(i => i.MemberAddress != null && i.CompletedAt != null)
            .GroupBy(i => i.MemberAddress)
            .Select(i => i.OrderByDescending(j => j.CompletedAt).First())
            .Join(dbContext.SiteNodes, i => i.MemberAddress, i => i.MemberAddress, (siteNodeRegistration, siteNode) => new { siteNodeRegistration, siteNode })
            .ToListAsync(cancellationToken))
            .ToDictionary(i => i.siteNode.Id, i => i.siteNodeRegistration);
    }
}
