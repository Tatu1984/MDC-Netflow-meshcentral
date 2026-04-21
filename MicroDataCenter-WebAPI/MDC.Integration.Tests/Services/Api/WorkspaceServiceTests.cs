using MDC.Core;
using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Tests;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Graph;
using System.Net;
using System.Net.WebSockets;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MDC.Integration.Tests.Services.Api;

public class WorkspaceServiceTests : BaseIntegrationTests
{
    // Compare the actual Workspace against the expected descriptor
    private async Task<Workspace> CompareWorkspaceAsync(IServiceScope serviceScope, Workspace workspace, JsonNode descriptor)
    {
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        var remoteNetworkService = serviceScope.ServiceProvider.GetRequiredService<IRemoteNetworkService>();
        
        Assert.NotNull(workspace.Name);
        Assert.NotEmpty(workspace.Name);
        Assert.NotEqual(Guid.Empty, workspace.Organization?.Id);
        
        var descriptorVirtualNetworks = descriptor["virtualNetworks"].Deserialize<VirtualNetworkDescriptor[]>(JsonSerializerOptions.Web);
        var descriptorVirtualMachines = descriptor["virtualMachines"].Deserialize<VirtualMachineDescriptor[]>(JsonSerializerOptions.Web);

        // Validate the Virtual Networks are created
        Assert.NotNull(workspace.VirtualNetworks);
        Assert.NotEmpty(workspace.VirtualNetworks);
        if (descriptorVirtualNetworks == null)
        {
            Assert.True(workspace.VirtualNetworks.Count() > 0);
            
            // These tests are only valid when Creating a workspace, but when updating a workspace, it could already have virtual networks described
            //var virtualNetwork = workspace.VirtualNetworks.First();
            //Assert.Equal("vnet0", virtualNetwork.Name);
            //Assert.Equal(0, virtualNetwork.Index);
            //Assert.Null(virtualNetwork.RemoteNetworkId);
        }
        else
        {
            Assert.NotNull(workspace.VirtualNetworks);
            Assert.Equal(workspace.VirtualNetworks.Count(), workspace.VirtualNetworks.Select(i => i.Index).Distinct().Count()); // Ensure that each of the Workspace Virtual Network indices are unique

            // for (int i = 0; i < descriptorVirtualNetworks!.Length; i++)
            foreach (var descriptorVirtualNetwork in descriptorVirtualNetworks)
            {
                // Verify that the requested Virtual Network exists
                var virtualNetwork = workspace.VirtualNetworks.Single(vn => vn.Name == (descriptorVirtualNetwork.Name ?? $"vnet{vn.Index}"));
                // Assert.Single(workspace.VirtualNetworks, vn => vn.Name == (descriptorVirtualNetwork.Name ?? $"vnet{vn.Index}"));
                //Assert.Equal(descriptorVirtualNetworks[i].Name ?? $"vnet{i}", virtualNetwork.Name);

                if (descriptorVirtualNetwork.EnableRemoteNetwork == true)
                {
                    // descriptorVirtualNetwork.RemoteNetworkIPRangeStart
                    Assert.NotNull(virtualNetwork.RemoteNetworkId);
                    Assert.NotNull(virtualNetwork.ZeroTierNetworkId);
                    Assert.NotEmpty(virtualNetwork.ZeroTierNetworkId);

                    var remoteNetwork = await remoteNetworkService.GetByIdAsync(virtualNetwork.RemoteNetworkId.Value, TestContext.Current.CancellationToken);
                    Assert.NotNull(remoteNetwork);

                    if (descriptorVirtualNetwork.RemoteNetworkIPRangeStart != null)
                        Assert.Equal(descriptorVirtualNetwork.RemoteNetworkIPRangeStart, remoteNetwork.IPAssignmentPools?.Single().IPRangeStart);

                    if (descriptorVirtualNetwork.RemoteNetworkIPRangeEnd != null)
                        Assert.Equal(descriptorVirtualNetwork.RemoteNetworkIPRangeEnd, remoteNetwork.IPAssignmentPools?.Single().IPRangeEnd);

                    if (descriptorVirtualNetwork.RemoteNetworkAddressCIDR != null)
                        Assert.Equal(descriptorVirtualNetwork.RemoteNetworkAddressCIDR, remoteNetwork.ManagedRoutes?.Single().Target);


                    var enabledVirtualMachines = (descriptorVirtualMachines ?? [])
                        .Where(vm => (vm.NetworkAdapters ?? []).Any(na => na.EnableRemoteNetwork && na.RefVirtualNetworkName == descriptorVirtualNetwork.Name))
                        ?? [];

                    if (enabledVirtualMachines.Any())
                    {
                        Assert.NotNull(remoteNetwork.Members);
                        Assert.NotEmpty(remoteNetwork.Members);
                    }
                    else
                    {
                        Assert.NotNull(remoteNetwork.Members);
                        Assert.Empty(remoteNetwork.Members);
                    }
                }
                else
                {
                    Assert.Null(virtualNetwork.RemoteNetworkId);
                    Assert.Null(virtualNetwork.ZeroTierNetworkId);
                }
            }
        }

        if (descriptorVirtualMachines != null)
        {
            //for (int idx = 0; idx < descriptorVirtualMachines.Length; idx++)
            foreach (var virtualMachineDescriptor in descriptorVirtualMachines)
            {
                Assert.NotNull(workspace.VirtualMachines);

                var virtualMachine = workspace.VirtualMachines.SingleOrDefault(i => i.Name == (virtualMachineDescriptor.Name ?? $"VirtualMachine{i.Index:D2}"));
                Assert.NotNull(virtualMachine);

                Assert.NotNull(virtualMachine.NetworkAdapters);
                Assert.NotEmpty(virtualMachine.NetworkAdapters);

                if (virtualMachineDescriptor.NetworkAdapters != null)
                {
                    Assert.NotNull(virtualMachine.NetworkAdapters);

                    // Assert.Equal(virtualMachineDescriptor.NetworkAdapters.Length, virtualMachine.NetworkAdapters.Length);

                    //for (int adapterIdx = 0; adapterIdx < virtualMachineDescriptor.NetworkAdapters.Length; adapterIdx++)
                    foreach (var adapterDescriptor in virtualMachineDescriptor.NetworkAdapters)
                    {
                        //var adapterDescriptor = virtualMachineDescriptor.NetworkAdapters[adapterIdx];

                        // var virtualNetwork = workspace.VirtualNetworks.Single(i => i.Id == virtualMachine.NetworkAdapters[adapterIdx].VirtualNetworkId);
                        var refVirtualNetwork = workspace.VirtualNetworks.Single(vn => adapterDescriptor.RefVirtualNetworkName == null || vn.Name == adapterDescriptor.RefVirtualNetworkName);
                        var virtualMachineNetworkAdapter = virtualMachine.NetworkAdapters.Single(na => na.VirtualNetworkId == refVirtualNetwork.Id);

                        if (adapterDescriptor.MACAddress != null)
                            Assert.Equal(adapterDescriptor.MACAddress, virtualMachineNetworkAdapter.MACAddress);

                        if (adapterDescriptor.IsDisconnected != null)
                            Assert.Equal(adapterDescriptor.IsDisconnected, virtualMachineNetworkAdapter.IsDisconnected);

                        if (adapterDescriptor.Name != null)
                            Assert.Equal(adapterDescriptor.Name, virtualMachineNetworkAdapter.Name);

                        if (adapterDescriptor.EnableRemoteNetwork)
                        {
                            // Find the VM actual network adapter for the network adapter specified in the descriptor
                            var networkAdapter = virtualMachine.NetworkAdapters.Single(i => adapterDescriptor.Name == null || i.Name == adapterDescriptor.Name);

                            Assert.NotNull(networkAdapter.NetworkInterfaces);
                            var ztNetwork = networkAdapter.NetworkInterfaces.FirstOrDefault(i => i.Name.StartsWith("zt") && i.Prefix <= 32);    // Look for IPv4 addresses only
                            Assert.NotNull(ztNetwork);
                            Assert.NotNull(ztNetwork.IPAddress);
                            Assert.True(IPAddress.TryParse(ztNetwork.IPAddress, out var address));
                            Assert.Equal(System.Net.Sockets.AddressFamily.InterNetwork, address.AddressFamily);

                            if (adapterDescriptor.RemoteNetworkIPAddress != null)
                                Assert.Single(networkAdapter.NetworkInterfaces, ni => ni.IPAddress == adapterDescriptor.RemoteNetworkIPAddress);
                        }
                    }
                }
            }
        }

        var workspaces = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotEmpty(workspaces);
        Assert.Single(workspaces, i => i.Id == workspace.Id);

        // TODO: Check if the Virtual Machine template name is populated when exists
        var actualDescriptor = await workspaceService.GetWorkspaceDescriptorAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(actualDescriptor);
        if (workspace.VirtualMachines?.Count() > 0)
        {
            Assert.NotNull(workspace.VirtualMachines);
            Assert.NotNull(actualDescriptor.VirtualMachines);
            Assert.Equal(workspace.VirtualMachines.Count(), actualDescriptor.VirtualMachines.Count());

            foreach (var expectedVirtualMachine in workspace.VirtualMachines)
            {
                var descriptorVirtualMachine = actualDescriptor.VirtualMachines.Single(i => i.Name == expectedVirtualMachine.Name);
                Assert.NotNull(descriptorVirtualMachine.TemplateName);
            }


        }
        return workspace;
    }

    // Ensure that the Workspace Descriptor accurately describes the actual workspace
    private async Task CompareWorkspaceDescriptorAsync(IServiceScope serviceScope, Workspace workspaceDetail, WorkspaceDescriptor descriptor)
    {
        Assert.Equal(workspaceDetail.Name, descriptor.Name);
        Assert.Equal(workspaceDetail.Description, descriptor.Description);

        Assert.NotNull(descriptor.VirtualNetworks);
        Assert.Equal(workspaceDetail.VirtualNetworks.Select(i => i.Name).Order(), descriptor.VirtualNetworks.Select(i => i.Name).Order());
        Assert.Equal(workspaceDetail.VirtualMachines?.Select(i => i.Name).Order(), descriptor.VirtualMachines?.Select(i => i.Name).Order());

        foreach (var workspaceVirtualNetwork in workspaceDetail.VirtualNetworks)
        {
            var descriptorVirtualNetwork = descriptor.VirtualNetworks.Single(i => i.Name == workspaceVirtualNetwork.Name);
            
            Assert.Equal(workspaceVirtualNetwork.GatewayStatus == null, descriptorVirtualNetwork.Gateway == null); 
            Assert.Equal(workspaceVirtualNetwork.ZeroTierNetworkId != null, descriptorVirtualNetwork.EnableRemoteNetwork == true);
            Assert.Equal(workspaceVirtualNetwork.RemoteNetworkId != null, descriptorVirtualNetwork.EnableRemoteNetwork == true);

            if (descriptorVirtualNetwork.Gateway != null)
            {
                Assert.NotNull(descriptorVirtualNetwork.Gateway.TemplateName);
                Assert.NotNull(descriptorVirtualNetwork.Gateway.TemplateRevision);
            }
        }

        if (workspaceDetail.VirtualMachines == null) return;

        Assert.NotNull(descriptor.VirtualMachines);
        foreach (var workspaceVirtualMachine in workspaceDetail.VirtualMachines)
        {
            var descriptorVirtualMachine = descriptor.VirtualMachines.Single(i => i.Name == workspaceVirtualMachine.Name);
            Assert.NotNull(descriptorVirtualMachine.TemplateName);
            Assert.NotNull(descriptorVirtualMachine.TemplateRevision);
            Assert.Equal(workspaceVirtualMachine.Memory, descriptorVirtualMachine.MemoryMB.ToString());
            Assert.Equal(workspaceVirtualMachine.Cores, descriptorVirtualMachine.CPUCores);

            Assert.NotNull(workspaceVirtualMachine.NetworkAdapters);
            Assert.NotNull(descriptorVirtualMachine.NetworkAdapters);
            Assert.Equal(workspaceVirtualMachine.NetworkAdapters.Select(i => i.Name).Order(), descriptorVirtualMachine.NetworkAdapters.Select(i => i.Name).Order());

            foreach (var workspaceVMNetworkAdapter in workspaceVirtualMachine.NetworkAdapters)
            {
                var descriptorVMNetworkAdapter = descriptorVirtualMachine.NetworkAdapters.Single(i => i.Name == workspaceVMNetworkAdapter.Name);

                Assert.NotNull(descriptorVMNetworkAdapter.MACAddress);
                Assert.Equal(workspaceVMNetworkAdapter.IsDisconnected, descriptorVMNetworkAdapter.IsDisconnected);

                var workspaceRefVirtualNetwork = workspaceDetail.VirtualNetworks.Single(i => i.Id == workspaceVMNetworkAdapter.VirtualNetworkId);
                Assert.Equal(workspaceRefVirtualNetwork.Name, descriptorVMNetworkAdapter.RefVirtualNetworkName);

                var remoteNetworkInterfaces = workspaceVMNetworkAdapter.NetworkInterfaces?.Where(i => i.Name.StartsWith("zt")).ToList();
                Assert.Equal(remoteNetworkInterfaces?.Any(), descriptorVMNetworkAdapter.EnableRemoteNetwork);
                // descriptorVMNetworkAdapter.RemoteNetworkIPAddress
            }
        }

    }

    [Fact]
    public void GetWorkspaceService()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(service);
        Assert.IsType<WorkspaceService>(service);
    }

    [Fact]
    public async Task GetAllAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        RunAsPrivileged(serviceScope);

        var service = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(service);
        Assert.IsType<WorkspaceService>(service);

        // ACT: Call the method to get the workspaces data
        var workspaces = await service.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(workspaces);
        Assert.NotEmpty(workspaces);

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var json = JsonSerializer.Serialize(workspaces, options);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.NotNull(dbContext);

        var dbWorkspaces = await dbContext.Workspaces.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(dbWorkspaces);
        Assert.NotEmpty(dbWorkspaces);

        foreach (var dbWorkspace in dbWorkspaces)
        {
            Assert.Single(workspaces, i => i.Id == dbWorkspace.Id);   
            var workspace = workspaces.Single(i => i.Id == dbWorkspace.Id);
            Assert.Equal(dbWorkspace.Name, workspace.Name);

            var dbVirtualNetworks = await dbContext.VirtualNetworks
                .Where(vn => vn.WorkspaceId == dbWorkspace.Id)
                .ToArrayAsync(TestContext.Current.CancellationToken);
            Assert.NotNull(workspace.VirtualNetworks);
            Assert.Equal(dbVirtualNetworks.Length, workspace.VirtualNetworks.Count());
        }
    }

    [Fact]
    public async Task GetAllDetailAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        var workspaces = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);

        foreach (var workspace in workspaces)
        {
            var detail = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(detail);
        }
    }

    [Fact]
    public async Task CompareAllDescriptorAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        var workspaces = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);

        foreach (var workspace in workspaces)
        {
            if (!workspace.Name.Contains("Firewall")) continue;

            var workspaceDetail = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(workspaceDetail);

            var descriptor = await workspaceService.GetWorkspaceDescriptorAsync(workspace.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(descriptor);

            await CompareWorkspaceDescriptorAsync(serviceScope, workspaceDetail, descriptor);
        }
    }

    /*
    [Theory]
    [ClassData(typeof(TheoryConfigurationKeys))]
    public async Task GetByIdAsync(string theoryConfigurationKey)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfigurationKey);

        var service = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(service);
        Assert.IsType<WorkspaceService>(service);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.NotNull(dbContext);

        var dbWorkspaces = await dbContext.Workspaces
            .Where(i => i.Datacenter!.Name == theoryConfigurationKey)
            .Include(i => i.VirtualNetworks)
            .ToArrayAsync();
        Assert.NotNull(dbWorkspaces);
        Assert.NotEmpty(dbWorkspaces);

        // ACT: Call the method to get the workspaces data
        foreach (var dbWorkspace in dbWorkspaces)
        {
            var workspace = await service.GetByIdAsync(theoryConfigurationKey, dbWorkspace.Id);
            Assert.NotNull(workspace);

            Assert.Equal(dbWorkspace.Id, workspace.Id);
            Assert.Equal(dbWorkspace.Name, workspace.Name);
            Assert.Equal(dbWorkspace.Address, workspace.Address);
            Assert.Equal(dbWorkspace.VirtualNetworks.Count, workspace.VirtualNetworks.Count());
        }
    }
    */

    private class WorkspaceDescriptorActivity
    {
        public required string Action { get; set; }
        public required string FileName { get; set; }
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "WorkspaceDescriptors")]
    public async Task CreateWorkspacesAsync(IConfigurationSection theoryConfiguration)
    {
        string[] actions =
            [
                "create",
                "update"
            ];

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var configuration = serviceScope.ServiceProvider.GetRequiredService<IConfiguration>();
        var tenantContext = serviceScope.ServiceProvider.GetRequiredService<ITenantContext>();
        Assert.NotNull(tenantContext.ObjectId);

        var runAsUserId = configuration.GetValue<string>("IntegrationTest_RunAsUserId");
        if (runAsUserId != null)
        {
            // Make sure that the runAsUserId is registered
            var userId = Guid.Parse(runAsUserId);
            ((TestMDCPrincipalAccessor)tenantContext).IsPrivilegedUser = true;
            ((TestMDCPrincipalAccessor)tenantContext).ObjectId = userId;
            var runAsUserRole = "GlobalAdministrator";

            var userService = serviceScope.ServiceProvider.GetRequiredService<IUserService>();
            var existing = await userService.GetByIdAsync(userId, TestContext.Current.CancellationToken);

            if (existing == null)
            {
                var newUser = await userService.CreateAsync(new Shared.Models.UserRegistrationDescriptor
                {
                    Id = runAsUserId,
                    ApplicationRoles = [runAsUserRole]
                }, TestContext.Current.CancellationToken);
            }
            else
            {
                if (!existing.AppRoles.Contains(runAsUserRole))
                {
                    var updated = await userService.UpdateAsync(userId, new UserUpdateDescriptor
                    {
                        AddApplicationRoles = [runAsUserRole]
                    }, TestContext.Current.CancellationToken);
                }

            }
        }

        var siteName = theoryConfiguration.GetValue<string>("siteName");
        // Assert.NotNull(siteName);

        var activities = theoryConfiguration.GetRequiredSection("activities").Get<WorkspaceDescriptorActivity[]>();
        Assert.NotNull(activities);
        Assert.NotEmpty(activities);
        Assert.All(activities, activity => Assert.True(File.Exists(activity.FileName)));
        Assert.All(activities, activity => Assert.Contains(activity.Action, actions, StringComparer.OrdinalIgnoreCase));

        var activityDescriptors = activities
            .Select(activity => new
            {
                activity.Action,
                DescriptorJson = JsonObject.Parse(File.ReadAllText(activity.FileName)) // JsonSerializer.Deserialize<WorkspaceDescriptor>(File.ReadAllText(activity.FileName), JsonSerializerOptions.Web)
            })
            .ToArray();

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();

        var sites = await siteService.GetAllAsync(TestContext.Current.CancellationToken);

        var site = (siteName != null)
            ? sites.FirstOrDefault(s => s.Name == siteName && s.SiteNodes.Any(n => n.Online == true))
            // : sites.FirstOrDefault(s => s.Name.StartsWith("0000") && s.SiteNodes.Any(n => n.Online == true));
            : sites.FirstOrDefault(s => s.SiteNodes.Any(n => n.Online == true));

        Assert.NotNull(site);
        Assert.NotEmpty(site.SiteNodes);

        var workspaceNames = activityDescriptors
            .Select(i => i.DescriptorJson?["name"]?.GetValue<string>())
            .Where(i => i != null)
            .Select(i => i!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        await DeleteWorkspaceAsync(serviceScope, workspaceNames!);

        // ACT: Call the method to get the workspaces data
        Workspace? workspace = null; ;
        foreach (var activity in activityDescriptors)
        {
            switch (activity.Action.ToLowerInvariant())
            {
                case "create":
                    {
                        Assert.NotNull(activity.DescriptorJson);
                        var descriptor = activity.DescriptorJson.Deserialize<WorkspaceDescriptor>(JsonSerializerOptions.Web);
                        Assert.NotNull(descriptor);
                        await EnsureVirtualMachineTemplates(serviceScope, site, descriptor);

                        // Get the an OrganizationId
                        var organizationsService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();

                        var organizations = await organizationsService.GetAllAsync(TestContext.Current.CancellationToken);

                        var targetOrganization = organizations.Cast<Organization>().FirstOrDefault(i => i.Name == DefaultOrganization);
                        if (targetOrganization == null)
                        {
                            targetOrganization = await organizationsService.CreateAsync(new OrganizationDescriptor
                            {
                                Name = DefaultOrganization,
                                SiteIds = new[] { site.Id },
                                OrganizationUserRoles = null
                                //OrganizationUserRoles = new[] 
                                //{ 
                                //    new OrganizationUserRoleDescriptor
                                //    {
                                //        Role = "test",
                                //        UserId = tenantContext.ObjectId.Value
                                //    }
                                //}
                            }, TestContext.Current.CancellationToken);
                        }
                        if (!(targetOrganization.Sites ?? []).Select(i => i.Id).Contains(site.Id))
                        {                             
                            targetOrganization = await organizationsService.UpdateAsync(targetOrganization.Id, new OrganizationUpdateDescriptor
                            {
                                AddSiteIds = new[] { site.Id }
                            }, TestContext.Current.CancellationToken);
                        }
                        workspace = await CreateWorkspaceAsync(serviceScope, site.Id, targetOrganization.Id, activity.DescriptorJson);

                        workspace = await CompareWorkspaceAsync(serviceScope, workspace, activity.DescriptorJson);

                        break;
                    }
                case "update":
                    {
                        Assert.NotNull(workspace);
                        //var delta = JsonSerializer.SerializeToNode(activity.Descriptor);
                        Assert.NotNull(activity.DescriptorJson);

                        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

                        await workspaceService.UpdateAsync(workspace.Id, activity.DescriptorJson, TestContext.Current.CancellationToken);

                        var updatedWorkspace = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
                        Assert.NotNull(updatedWorkspace);

                        workspace = await CompareWorkspaceAsync(serviceScope, updatedWorkspace, activity.DescriptorJson);
                        break;
                    }
                default:
                    throw new InvalidOperationException($"Unsupported action '{activity.Action}'.");
            }
        }

        await DeleteWorkspaceAsync(serviceScope, workspaceNames);
    }

    //[Fact(Skip = "Hardcoded")]
    //public async Task RegisterAndAssignOrganizationAsync()
    //{
    //    // var id = "0eb16241-1441-4f1e-b7e1-5799414d0839"; // Jonathan Kyle Test
    //    var id = "597fd1a6-e7ae-475f-a495-32e7cca09d06";    // achyut.pal@infinititechpartners.com

    //    IServiceCollection serviceDescriptors = new ServiceCollection();
    //    using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

    //    RunAsPrivileged(serviceScope);


    //    var service = serviceScope.ServiceProvider.GetRequiredService<IUserService>();
    //    Assert.NotNull(service);
    //    Assert.IsType<UserService>(service);

    //    var newUser = await service.CreateAsync(new Shared.Models.UserRegistrationDescriptor
    //    {
    //        Id = id,
    //        ApplicationRoles = ["GlobalAdministrator"]
    //    }, TestContext.Current.CancellationToken);

    //    Assert.NotNull(newUser);
    //    Assert.Equal(id, newUser.Id.ToString());

    //    var datacenterTechnicianUser = await service.UpdateAsync(newUser.Id, new Shared.Models.UserUpdateDescriptor
    //    {
    //        AddApplicationRoles = ["DatacenterTechnician"],
    //    }, TestContext.Current.CancellationToken);

    //    Assert.NotNull(datacenterTechnicianUser);
    //    Assert.Contains("DatacenterTechnician", datacenterTechnicianUser.AppRoles);

    //    var updatedUser = await service.UpdateAsync(newUser.Id, new Shared.Models.UserUpdateDescriptor
    //    {
    //        RemoveApplicationRoles = ["DatacenterTechnician"],
    //    }, TestContext.Current.CancellationToken);

    //    Assert.NotNull(updatedUser);
    //    Assert.DoesNotContain("DatacenterTechnician", updatedUser.AppRoles);
    //}

    [Fact(Skip = "Alters Users")]
    public async Task GetGraphUsers_RemoveInvalidDatabaseEntries()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var graphClient = serviceScope.ServiceProvider.GetRequiredService<GraphServiceClient>();
        Assert.NotNull(graphClient);

        var options = serviceScope.ServiceProvider.GetRequiredService<IOptions<UserServiceOptions>>();
        Assert.NotNull(options);
        Assert.NotNull(options.Value.EnterpriseAppObjectId);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.NotNull(dbContext);

        var servicePrincipal = await graphClient.ServicePrincipals[options.Value.EnterpriseAppObjectId].GetAsync(null, TestContext.Current.CancellationToken);
        Assert.NotNull(servicePrincipal);

        var appRoleAssignments = await graphClient.ServicePrincipals[servicePrincipal.Id].AppRoleAssignments.GetAsync(null, TestContext.Current.CancellationToken);
        Assert.NotNull(appRoleAssignments);

        var users = await graphClient.Users.GetAsync(null, TestContext.Current.CancellationToken);
        Assert.NotNull(users);

        var validUserIDs = (users.Value?.Where(i => i.Id != null).Select(i => i.Id!) ?? []).ToHashSet();

        var dbUsers = await dbContext.Users.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(dbUsers);

        var invalidDbUsers = dbUsers.Where(u => !validUserIDs.Contains(u.Id.ToString())).ToArray();
        if (invalidDbUsers.Length > 0)
        {
            dbContext.RemoveRange(invalidDbUsers);
            await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        }
    }

    [Fact]
    public async Task RemoveOfflineSiteNodesAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);

        var sites = (await service.GetAllAsync(TestContext.Current.CancellationToken)).ToList();
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        foreach (var site in sites)
        {
            //if (site.SiteNodes.Any(i => i.Online == true))
            //    continue;

            //Assert.NotNull(site.Workspaces);
            //Assert.Empty(site.Workspaces);

            foreach (var siteNode in site.SiteNodes.Where(i => i.Online != true))
            {
                await service.DeleteAsync(site.Id, siteNode.Id, TestContext.Current.CancellationToken);
            }
        }
    }

    /*
    [Theory(Skip ="UAT Only")]
    [MemberData(nameof(GetTheoryDataRows), "RegisterSites")]
    public async Task CreateSitesAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.GetRequiredSection("siteDescriptor").Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        var expectedSiteNodeName = theoryConfiguration.GetValue<string>("siteNodeName");
        Assert.NotNull(expectedSiteNodeName);
        var expectedSiteName = theoryConfiguration.GetValue<string>("siteName");
        Assert.NotNull(expectedSiteName);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);
        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);

        var (site, actualSiteNode) = await service.CreateAsync(siteDescriptor, TestContext.Current.CancellationToken);
        Assert.NotNull(site);
        Assert.Equal(expectedSiteName, site.Name);

        var siteNode = site.SiteNodes.FirstOrDefault(i => i.Name == expectedSiteNodeName);
        Assert.NotNull(siteNode);

        Assert.True(siteNode.Online);
        Assert.NotNull(siteNode.Registered);
        Assert.True(siteNode.Authorized);

        await CompareSite(serviceScope, site.Id, site);
    }
    */

    [Fact]
    public async Task DetectCluster()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);
        Assert.IsType<SiteService>(siteService);

        var sites = (await siteService.GetAllAsync(TestContext.Current.CancellationToken)).ToList();
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        var candidateSites = sites.Where(i => i.SiteNodes.Count() == 1 && i.SiteNodes.Any(j => j.Online == true)).ToList();

        List<Site> possibleHostSite = new List<Site>();
        List<Site> possibleSiteNode = new List<Site>();
        foreach (var site in candidateSites)
        {
            try
            {
                var detail = await siteService.GetByIdAsync(site.Id, TestContext.Current.CancellationToken);
                Assert.NotNull(detail);
                if (detail.SiteNodes.Count() != 1)
                    continue;
                if (detail.ClusterName == detail.SiteNodes.Single().HostName)
                    continue;
                possibleHostSite.Add(detail);
            }
            catch (Exception)
            {
                possibleSiteNode.Add(site);
            }
        }

        // Check if the credentials for the sites with detail work on the sites without details - if so then those go together
        var mdcEndpointService = serviceScope.ServiceProvider.GetRequiredService<IMDCEndpointService>();
        Assert.NotNull(mdcEndpointService);

        IPVEClientFactory pveClientFactory = serviceScope.ServiceProvider.GetRequiredService<IPVEClientFactory>();
        Assert.NotNull(pveClientFactory);

        MDCDbContext dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.NotNull(dbContext);

        foreach (var host in possibleHostSite)
        {
            var hostSiteNode = host.SiteNodes.Single();
            List<Site> verifiedCluster = new List<Site>();

            foreach (var site in possibleSiteNode)
            {
                var siteNode = site.SiteNodes.Single();
                var mdcEndPoint = await mdcEndpointService.GetMicroDataCenterEndpointAsync(siteNode.MemberAddress, host.ApiTokenId, host.ApiSecret, siteNode.ApiPort, siteNode.ApiValidateServerCertificate, TestContext.Current.CancellationToken);
                Assert.NotNull(mdcEndPoint);

                var pveClient = pveClientFactory.Create(mdcEndPoint);

                try
                {
                    var clusterStatus = await pveClient.GetClusterStatusAsync(TestContext.Current.CancellationToken);
                    Assert.NotNull(clusterStatus);
                    verifiedCluster.Add(site);
                }
                catch (Exception)
                {
                    // The authentication didn't work, this is not a node for the current cluster
                }
            }

            // Merge the verified cluster sites nodes with the host site
            if (verifiedCluster.Count > 1)
            {
                using var transaction = await dbContext.Database.BeginTransactionAsync(TestContext.Current.CancellationToken);
                try
                {
                    var parent = await dbContext.Sites.FindAsync([host.Id], TestContext.Current.CancellationToken);
                    Assert.NotNull(parent);

                    foreach (var child in verifiedCluster)
                    {
                        var node = await dbContext.SiteNodes.FindAsync([child.SiteNodes.Single().Id], TestContext.Current.CancellationToken);
                        Assert.NotNull(node);

                        var oldParent = await dbContext.Sites.FindAsync([node.SiteId], TestContext.Current.CancellationToken);
                        Assert.NotNull(oldParent);

                        // Re-parent the child
                        node.SiteId = parent.Id;

                        // Delete the old parent
                        dbContext.Sites.Remove(oldParent);

                    }
                    await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
                    await transaction.CommitAsync(TestContext.Current.CancellationToken);
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync(TestContext.Current.CancellationToken);
                }
            }
        }
    }
}
