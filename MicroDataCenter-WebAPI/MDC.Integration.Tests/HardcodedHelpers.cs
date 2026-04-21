using MDC.Core;
using MDC.Core.Extensions;
using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Net.WebSockets;
using System.Text.Json.Nodes;
using System.Threading;

namespace MDC.Integration.Tests;

public class HardcodedHelpers : BaseIntegrationTests
{
    [Fact]
    public async Task ReApproveSitesAsync()
    {
        // This will ensure that the sites have the latest setup updates applied
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteNodeRegistrationService>();
        Assert.NotNull(service);
        Assert.IsType<SiteNodeRegistrationService>(service);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var registrations = await service.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(registrations);
        var listRegistration = registrations.ToList();

        var approvedRegistrations = listRegistration.Where(i => i.Online == true && i.Authorized == true).ToArray();
        foreach (var registration in approvedRegistrations)
        {
            var (site, siteNode) = await service.ApproveAsync(registration.UUID, new SiteNodeRegistrationApprovalDescriptor { SkipNetworkConfiguration = true }, TestContext.Current.CancellationToken);

            Assert.NotNull(site);
            Assert.NotNull(siteNode);
        }
    }

    [Fact]
    public async Task RelocateSiteAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.NotNull(dbContext);

        var oldSite = "mdc0001";
        var newSite = "ATDC Cluster";
        var address = 107;

        var dbSiteOld = await dbContext.Sites.AsNoTracking().FirstOrDefaultAsync(i => i.Name == oldSite, TestContext.Current.CancellationToken);
        var dbSiteNew = await dbContext.Sites.AsNoTracking().FirstOrDefaultAsync(i => i.Name == newSite, TestContext.Current.CancellationToken);
        Assert.NotNull(dbSiteOld);
        Assert.NotNull(dbSiteNew);

        var dbWorkspace = await dbContext.Workspaces.AsNoTracking().FirstOrDefaultAsync(i => i.Address == address && i.SiteId == dbSiteOld.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(dbWorkspace);

        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(workspaceService);

        {
            var workspaceDetail = await workspaceService.GetByIdAsync(dbWorkspace.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(workspaceDetail);
            Assert.Empty(workspaceDetail.VirtualMachines ?? []);
        }

        // Update the Workspace Site
        {
            var dbWorkspaceUpdate = await dbContext.Workspaces.FirstOrDefaultAsync(i => i.Address == address && i.SiteId == dbSiteOld.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(dbWorkspaceUpdate);

            dbWorkspaceUpdate.SiteId = dbSiteNew.Id;
            await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

            var workspaceDetail = await workspaceService.GetByIdAsync(dbWorkspace.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(workspaceDetail);
            Assert.NotEmpty(workspaceDetail.VirtualMachines ?? []);
        }
    }

    /*
    [Fact(Skip ="Hardcoded")]
    public async Task TestLockUnlockAsync()
    {
        var siteName = "mdc0003";
        var workspaceName = "LockUnlockTestWorkspace";

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var workspaceService= serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(workspaceService);
        
        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);

        // Delete Workspace if it exists
        await DeleteWorkspaceAsync(serviceScope, [workspaceName]);

        // Create Workspace
        var site = await siteService.GetByIdAsync(siteName, TestContext.Current.CancellationToken);
        Assert.NotNull(site);

        Assert.False(true); // TODO: Get an appropriate OrganizationId
        var workspace = await workspaceService.CreateAsync(new CreateWorkspaceParameters
        {
            SiteId = site.Id,
            OrganizationId = Guid.NewGuid(),
            Descriptor = new WorkspaceDescriptor
            {
                Name = workspaceName
            }
        }, TestContext.Current.CancellationToken);
        Assert.False(workspace.Locked);

        // Lock Workspace
        await workspaceService.SetWorkspaceLockAsync(workspace.Id, true, TestContext.Current.CancellationToken);
        workspace = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(workspace);
        Assert.True(workspace.Locked);

        var locked = await workspaceService.GetWorkspaceLockAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.True(locked);

        // Attempt to modify locked Workspace
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            var delta = JsonSerializer.SerializeToNode(new
            {
                Description = "Updated description on locked workspace"
            }, JsonSerializerOptions.Web);
            Assert.NotNull(delta);
            await workspaceService.UpdateAsync(workspace.Id, delta, TestContext.Current.CancellationToken);
        });

        // Unlock Workspace
        await workspaceService.SetWorkspaceLockAsync(workspace.Id, false, TestContext.Current.CancellationToken);
        workspace = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(workspace);
        Assert.False(workspace.Locked);

        locked = await workspaceService.GetWorkspaceLockAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.False(locked);

        // Delete Workspace
        await DeleteWorkspaceAsync(serviceScope, [workspaceName]);
    }
    */
    

    [Fact(Skip = "Hardcoded")]
    public async Task TestVMRemoteNetwork()
    {
        var workspaceId = Guid.Parse("019bd856-a20c-7f73-843a-de3c8136f6f1");
        var delta = JsonNode.Parse("{\r\n    \"virtualNetworks\": [\r\n    {\r\n\"name\": \"vnet0\",\r\n      \"enableRemoteNetwork\": true\r\n    }\r\n  ],\r\n  \"virtualMachines\": [\r\n    {\r\n      \"name\": \"DistributiveWorker\",\r\n      \"networkAdapters\": [\r\n        {\r\n\"name\": \"net0\",\r\n          \"enableRemoteNetwork\": false\r\n        }\r\n      ]\r\n    }\r\n  ]\r\n}");

        Assert.NotNull(delta);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(workspaceService);


        await workspaceService.UpdateAsync(workspaceId, delta, TestContext.Current.CancellationToken);
    }


    //[Fact(Skip = "Hardcoded")]
    [Fact]
    public async Task TestConsoleWebSocketAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(workspaceService);

        var workspaceId = Guid.Parse("019d8e27-bc67-7878-b2e4-c08025d9fd9a");

        var workspace = await workspaceService.GetByIdAsync(workspaceId, TestContext.Current.CancellationToken);
        Assert.NotNull(workspace);

        await workspaceService.SetWorkspaceLockAsync(workspaceId, false, TestContext.Current.CancellationToken);
        using var vncSession = await workspaceService.InitializeVNCSessionAsync(workspaceId, 0, TestContext.Current.CancellationToken);
        Assert.NotNull(vncSession);

        await vncSession.ClientWebSocket.ConnectAsync(new Uri(vncSession.Url), TestContext.Current.CancellationToken);

        var buffer = new byte[8192];

        var result = await vncSession.ClientWebSocket.ReceiveAsync(new ArraySegment<byte>(buffer), TestContext.Current.CancellationToken);
        Assert.True(result.EndOfMessage);

        Assert.Equal(WebSocketMessageType.Binary, result.MessageType);

        var message = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
        //Assert.NotNull(message);

        await vncSession.ClientWebSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed", TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task CleanDatabase_WorkspacesAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        Assert.NotNull(workspaceService);

        var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        // var workspaces = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);

        var dbWorkspaces = await context.Workspaces.ToArrayAsync(TestContext.Current.CancellationToken);

        List<DbWorkspace> offlineWorkspaces = new List<DbWorkspace>();
        List<(DbWorkspace, Workspace)> problemWorkspaces = new();

        foreach (var dbWorkspace in dbWorkspaces)
        {
            try
            {
                var workspace = await workspaceService.GetByIdAsync(dbWorkspace.Id, TestContext.Current.CancellationToken);
                if (workspace == null)
                    continue;

                if (
                    (workspace.VirtualMachines ?? []).Any(vm => vm.Status != "running")
                    || workspace.VirtualNetworks.Any(vn => vn.Index == 0 && vn.GatewayStatus != "running")
                    )
                    problemWorkspaces.Add((dbWorkspace, workspace));

            }
            catch (Exception ex)
            {
                offlineWorkspaces.Add(dbWorkspace);
                TestContext.Current.AddWarning(ex.ToString());
            }
        }

        foreach (var entry in problemWorkspaces)
        {
            try
            {
                await workspaceService.DeleteAsync(entry.Item1.Id, TestContext.Current.CancellationToken);
            }
            catch (Exception ex)
            {
                // Do nothing
                TestContext.Current.AddWarning(ex.ToString());
            }
        }

        //var missingWorkspaces = dbWorkspaces.ExceptBy(workspaces.Select(i => i.Id), i => i.Id).ToArray();

        //var sortedDbWorkspaces = dbWorkspaces.OrderBy(i => i.Address).ToArray().GroupBy(i => i.SiteId);
        //var sortedWorkspaces = workspaces.OrderBy(i => i.Address).ToArray().GroupBy(i => i.SiteId);

        //Assert.NotNull(missingWorkspaces);
    }



    private static class MDCResourceType
    {
        public const string VirtualMachine = "VM";
        public const string Gateway = "GW";
        public const string Bastion = "BA";
    }

    private static string[] MDCResourceTypes => new[]
    {
        MDCResourceType.VirtualMachine,
        MDCResourceType.Gateway,
        MDCResourceType.Bastion
    };

    private static bool ParseMDCVirtualMachineName(string? resourceName, bool isTemplate, out int? workspaceAddress, out string? type, out int? index, out string? name)
    {
        workspaceAddress = null;
        type = null;
        index = null;
        name = null;

        // MDC Resources Qemu virtual machine name is expected to have a specific format: <prefix>.<name>
        // Where <prefix> split into two parts for a template and 3 parts for a Virtual Machine.
        // When the resource is not a template, the prefix begins with 4 digits for the Workspace Address.  The remaining characters are the two characters representing the resource type, and optionally followed by an digits for the resource Index.

        var parts = resourceName?.Split('.');
        if (parts?.Length != 2)
            return false;

        string prefix = parts[0];
        int? __workspaceAddress = null;
        if (!isTemplate)
        {
            if (!int.TryParse(parts[0].Substring(0, 4), out int _workspaceAddress))
            {
                return false; // The first part must be a valid 4-digit workspace address
            }
            __workspaceAddress = _workspaceAddress;
            prefix = prefix.Substring(4); // Remove the workspace address from the prefix
        }

        string __resourceType = prefix.Substring(0, 2); // Get next two characters as the resource type
        if (!MDCResourceTypes.Contains(__resourceType))
            return false;
        prefix = prefix.Substring(2); // Remove the resource type from the prefix

        int __resourceIndex = 0;
        if (!int.TryParse(prefix, out int _resourceIndex))
        {
            if (string.IsNullOrEmpty(prefix))
            {
                __resourceIndex = 0; // If no index is provided, default to 0
            }
            else
            {
                return false; // If the prefix is not empty and not a valid number, return false
            }
        }
        else
        {
            __resourceIndex = _resourceIndex; // Set the resource index if it is a valid number
        }

        workspaceAddress = __workspaceAddress;
        type = __resourceType;
        index = __resourceIndex;
        name = parts[1]; // The second part is the resource name
        return true;
    }

    [Fact]
    public async Task ConvertBastionToVMAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var mdcEndpointSerivce = serviceScope.ServiceProvider.GetRequiredService<IMDCEndpointService>();
        var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var pveClientFactory = serviceScope.ServiceProvider.GetRequiredService<IPVEClientFactory>();

        var sites = await context.Sites
            .Include(site => site.SiteNodes)
            .ToArrayAsync(TestContext.Current.CancellationToken);
        foreach (var site in sites)
        {
            // Create pveClient
            var mdcEndpoints = await mdcEndpointSerivce.GetMicroDataCenterEndpointsAsync(site, TestContext.Current.CancellationToken);
            var mdcEndpoint = mdcEndpoints.FirstOrDefault();
            if (mdcEndpoint == null)
                continue;   // No endpoint available for the site at this time
            var pveClient = pveClientFactory.Create(mdcEndpoint);

            // Rename each of the BA resources to VM resources, and be sure to use an unused index
            var resources = await pveClient.GetClusterResourcesAsync(TestContext.Current.CancellationToken);
            var resourceMap = resources
                .Where(resource => resource.Node != null && resource.VmId != null && resource.Name != null)
                .Select(resource =>
                {
                    var isValid = ParseMDCVirtualMachineName(resource.Name, resource.Template == true, out var workspaceAddress, out var type, out var index, out var name);
                    return new
                    {
                        resource,
                        isValid,
                        workspaceAddress,
                        type,
                        index,
                        name
                    };
                })
                .Where(entry => entry.isValid && entry.workspaceAddress.HasValue)
                .ToLookup(entry => entry.workspaceAddress!.Value);

            foreach (var entry in resourceMap)
            {
                var bastions = entry.Where(i => i.type == MDCResourceType.Bastion).ToArray();
                var virtualMachines = entry.Where(i => i.type == MDCResourceType.VirtualMachine).ToArray();

                var existingVMIndices = virtualMachines.Select(i => i.index!.Value).ToList();
                var existingVMNames = virtualMachines.Select(i => i.name!).ToList();

                foreach (var bastion in bastions)
                {
                    Assert.NotNull(bastion.workspaceAddress);
                    Assert.NotNull(bastion.name);

                    var nextIndex = Enumerable.Range(0, existingVMIndices.Count + 1).Except(existingVMIndices).First();

                    var newName = $"{bastion.name}-BA";
                    if (existingVMNames.Contains(newName))
                    {
                        for (var i = 0; i < existingVMNames.Count; i++)
                        {
                            newName = $"{bastion.name}-BA{i}";
                            if (!existingVMNames.Contains(newName))
                                break;
                        }
                    }

                    var resourceName = MDCHelper.FormatVirtualMachineName(bastion.workspaceAddress.Value, MDCResourceType.VirtualMachine, nextIndex, newName);

                    await pveClient.UpdateQemuConfigAsync(bastion.resource.Node!, bastion.resource.VmId!.Value, new PVEQemuConfig { Name = resourceName }, [], [], TestContext.Current.CancellationToken);
                }
            }
        }
    }

    /*
    [Fact(Skip = "Hardcoded nodeid")]
    public async Task AddRemoveAsync()
    {
        Guid uuid = Guid.NewGuid();
        var nodeId = "d6a31c3848";
        var deviceInformation = new JsonObject
        {
            ["name"] = "Test Device",
            ["model"] = "Test Model",
            ["serialNumber"] = "1234567890"
        };
        var firstBootInformation = new JsonObject
        {
            ["nodeId"] = nodeId
        };

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        {
            // Cleanup
            var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
            var existingRegistrations = await dbContext.SiteNodeRegistrations.Where(i => i.MemberAddress == nodeId || i.MemberAddress == null).ToArrayAsync(TestContext.Current.CancellationToken);
            if (existingRegistrations.Length > 0)
            {
                dbContext.SiteNodeRegistrations.RemoveRange(existingRegistrations);
                await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
            }
        }

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteNodeRegistrationService>();
        Assert.NotNull(service);
        Assert.IsType<SiteNodeRegistrationService>(service);

        Assert.Fail("TODO: RequestAutoInstallationAsync must be called first");


        var step1 = await service.NotifyAutoInstallationAsync(uuid, deviceInformation, TestContext.Current.CancellationToken);
        Assert.NotNull(step1);
        Assert.Equal(machineId, step1.MachineId);
        Assert.NotNull(step1.DeviceInfo);
        Assert.Null(step1.CompletedAt);

        var step2 = await service.CompleteFirstBootAsync(uuid, firstBootInformation, TestContext.Current.CancellationToken);
        Assert.NotNull(step2);
        Assert.Equal(machineId, step2.MachineId);
        Assert.NotNull(step2.CompletedAt);
        Assert.NotNull(step2.DeviceInfo);
        Assert.True(step2.Online);
        
        await service.DeleteAsync(step2.Id, TestContext.Current.CancellationToken);
    }
    */

    [Fact]
    public async Task LinkSiteNodeRegistrationsToSiteAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var siteNodeRegistrationService = serviceScope.ServiceProvider.GetRequiredService<ISiteNodeRegistrationService>();
        Assert.NotNull(siteNodeRegistrationService);
        Assert.IsType<SiteNodeRegistrationService>(siteNodeRegistrationService);

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.NotNull(dbContext);

        var registrations = await siteNodeRegistrationService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(registrations);

        var sites = await siteService.GetAllAsync(TestContext.Current.CancellationToken);
        var siteNodes = sites.SelectMany(i => i.SiteNodes).ToList();

        foreach (var registration in registrations.Where(i => i.SiteNodeId == null))
        {
            var matches = siteNodes.Where(i => i.MemberAddress == registration.MemberAddress).ToList();
            Assert.Single(matches);
            // await siteNodeRegistrationService.DeleteAsync(registration.Id, TestContext.Current.CancellationToken);

            var dbSiteNodeRegistration = await dbContext.SiteNodeRegistrations.FirstOrDefaultAsync(i => i.Id == registration.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(dbSiteNodeRegistration);

            dbSiteNodeRegistration.SiteNodeId = matches.Single().Id;
            await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        }
    }

    [Fact]
    public async Task DeleteUnapprovedOfflineRegistrationsAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var siteNodeRegistrationService = serviceScope.ServiceProvider.GetRequiredService<ISiteNodeRegistrationService>();
        Assert.NotNull(siteNodeRegistrationService);
        Assert.IsType<SiteNodeRegistrationService>(siteNodeRegistrationService);

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);

        var registrations = await siteNodeRegistrationService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(registrations);

        var unapprovedRegistrations = registrations.Where(i => i.Online != true && i.SiteNodeId == null).ToArray();
        foreach (var registration in unapprovedRegistrations)
        {
            await siteNodeRegistrationService.DeleteAsync(registration.Id, TestContext.Current.CancellationToken);
        }
    }

    [Fact]
    public async Task DeleteOfflineSiteNodeRegistrationSitesAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var siteNodeRegistrationService = serviceScope.ServiceProvider.GetRequiredService<ISiteNodeRegistrationService>();
        Assert.NotNull(siteNodeRegistrationService);

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);

        var registrations = await siteNodeRegistrationService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(registrations);

        var offlineRegistrations = registrations.Where(i => i.Online != true && i.SiteId == null).ToArray();
        foreach (var registration in offlineRegistrations)
        {
            await siteService.DeleteAsync(registration.SiteId!.Value, registration.SiteNodeId!.Value, TestContext.Current.CancellationToken);
        }
    }

    [Fact]
    public async Task ApproveUnconfiguredRegistrationsAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteNodeRegistrationService>();
        Assert.NotNull(service);
        Assert.IsType<SiteNodeRegistrationService>(service);

        var zeroTierService = serviceScope.ServiceProvider.GetRequiredService<IZeroTierService>();

        var registrations = await service.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(registrations);
        var listRegistration = registrations.ToList();

        var members = await zeroTierService.GetManagementNetworkMembersAsync(TestContext.Current.CancellationToken);

        var unapprovedRegistrations = listRegistration.Where(i => (i.Online == true || members.FirstOrDefault(j => j.NodeId == i.MemberAddress)?.Config?.Authorized == false) && i.SiteNodeId == null).ToArray();
        foreach (var registration in unapprovedRegistrations)
        {
            var (site, siteNode) = await service.ApproveAsync(registration.UUID, new SiteNodeRegistrationApprovalDescriptor { DataEgressOnMgmtNetwork = true }, TestContext.Current.CancellationToken);

            Assert.NotNull(site);
            Assert.NotNull(siteNode);
        }
    }

    [Fact]
    public async Task ReSync_SiteNodeRegistrationsAsync()
    {
        // This will ensure that the sites have the latest setup updates applied
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        var allSites = await siteService.GetAllAsync(TestContext.Current.CancellationToken);
        var allSiteNodes = allSites.SelectMany(i => i.SiteNodes).ToList();

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var allSiteNodeRegistrations = await dbContext.SiteNodeRegistrations.Include(i => i.SiteNode).AsNoTracking().ToArrayAsync(TestContext.Current.CancellationToken);
        var dbSiteNodes = await dbContext.SiteNodes
            .Include(i => i.SiteNodeRegistrations)
            .Include(i => i.Site)
            .AsSplitQuery().ToListAsync(TestContext.Current.CancellationToken);

        var mdcEndpointService = serviceScope.ServiceProvider.GetRequiredService<IMDCEndpointService>();

        List<Guid> siteNodesToDelete = new List<Guid>();

        foreach (var dbSiteNode in dbSiteNodes)
        {
            var targetSiteNode = allSiteNodes.Single(i => i.Id == dbSiteNode.Id);

            if (targetSiteNode.Online == true)
            {
                Assert.NotNull(dbSiteNode.Site);
                var pveClient = await mdcEndpointService.CreatePVEClientAsync(dbSiteNode, 30, TestContext.Current.CancellationToken);
                if (pveClient == null)
                {
                    continue;
                }
                var clusterStatus = await pveClient.GetClusterStatusAsync(TestContext.Current.CancellationToken);
                Assert.NotNull(clusterStatus);
                var siteNodeName = clusterStatus.GetLocalNode().Name;

                // var siteNodeName = $"{serial} ({dmiSystemName})";
                if (dbSiteNode.Name != siteNodeName)
                {
                    dbSiteNode.Name = siteNodeName;
                }
            }

            var siteNodeRegsitrations = dbSiteNode.SiteNodeRegistrations.ToList();

            if (siteNodeRegsitrations.Count != 1)
            {
                continue;
            }

            var registration = siteNodeRegsitrations.FirstOrDefault();
            Assert.NotNull(registration);

            if (string.IsNullOrEmpty(registration.DeviceInfo))
            {
                continue;
            }

            var deviceInfo = JsonObject.Parse(registration.DeviceInfo);
            Assert.NotNull(deviceInfo);
            var uuid = deviceInfo["dmi"]?["system"]?["uuid"]?.GetValue<Guid>();
            var serial = deviceInfo["dmi"]?["system"]?["serial"]?.GetValue<string>();
            var dmiSystemName = deviceInfo["dmi"]?["system"]?["name"]?.GetValue<string>();

            if (uuid == null)
            {
                continue;
            }

            if (serial == null)
            {
                continue;
            }

            if (dmiSystemName == null)
            {
                continue;
            }

            if (registration.SerialNumber != serial)
            {
                if (serial != "12345")
                {
                    registration.SerialNumber = serial;
                }
            }

            if (dbSiteNode.SerialNumber != serial)
            {
                if (serial != "12345")
                {
                    dbSiteNode.SerialNumber = serial;
                }
            }

            if (registration.UUID != uuid)
            {
                var duplicateUUID = allSiteNodeRegistrations.Where(i => i.UUID == uuid.Value).ToArray();
                if (duplicateUUID.Length > 0)
                {
                    // Always debugger break here so that the issue can be analysized and determine which SiteNode to delete
                    System.Diagnostics.Debugger.Break();

                    // Determine which SiteNodeRegistration to keep based on which has a MemberAddress that is current and online
                    var currentSiteNode = allSiteNodes.Single(i => i.Id == dbSiteNode.Id);
                    var duplicateSiteNodes = allSiteNodes.Where(i => duplicateUUID.Select(j => j.SiteNodeId).Contains(i.Id)).ToList();

                    duplicateSiteNodes.Add(currentSiteNode);

                    foreach (var duplicateSiteNode in duplicateSiteNodes)
                    {
                        if (duplicateSiteNode.Authorized == true && duplicateSiteNode.Online == true)
                        {
                            continue;
                        }

                        siteNodesToDelete.Add(duplicateSiteNode.Id);
                    }
                    
                }
                else
                {
                    if (serial != "12345")
                    {
                        registration.UUID = uuid.Value;
                    }
                }
            }
        }

        if (dbContext.ChangeTracker.HasChanges())
        {
            await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        if (siteNodesToDelete.Count > 0)
        {
            // Always debuger break here to ensure we really want to delete the site node
            System.Diagnostics.Debugger.Break();
            foreach (var deleteId in siteNodesToDelete)
            {
                var site = allSites.Single(i => i.SiteNodes.Any(j => j.Id == deleteId));
                await siteService.DeleteAsync(site.Id, deleteId, TestContext.Current.CancellationToken);
            }
        }

        //var registrations = await service.GetAllAsync(TestContext.Current.CancellationToken);
        //Assert.NotNull(registrations);
        //var listRegistration = registrations.ToList();

        //var approvedRegistrations = listRegistration.Where(i => i.Online == true && i.Authorized == true).ToArray();
        //foreach (var registration in approvedRegistrations)
        //{
        //    if (registration.DeviceInfo != null)
        //    {
        //        var deviceInfo = JsonObject.Parse(registration.DeviceInfo);
        //        if (deviceInfo != null)
        //        {
        //            var uuid = deviceInfo["dmi"]?["system"]?["uuid"]?.GetValue<string>();
        //            var serial = deviceInfo["dmi"]?["system"]?["serial"]?.GetValue<string>();
        //            var name = deviceInfo["dmi"]?["system"]?["name"]?.GetValue<string>();
        //        }
        //    }

        //    var (site, siteNode) = await service.ApproveAsync(registration.UUID, new SiteNodeRegistrationApprovalDescriptor { SkipNetworkConfiguration = true }, TestContext.Current.CancellationToken);

        //    Assert.NotNull(site);
        //    Assert.NotNull(siteNode);
        //}
    }

    //[Fact]
    [Fact(Skip = "Hardcoded Registration Id")]
    public async Task ApproveRegistrationAsync()
    {
        var target = Guid.Parse("aded5899-e084-022e-777b-f44d30cd5272");

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteNodeRegistrationService>();
        Assert.NotNull(service);
        Assert.IsType<SiteNodeRegistrationService>(service);

        var (site, siteNode) = await service.ApproveAsync(target, new SiteNodeRegistrationApprovalDescriptor { DataEgressOnMgmtNetwork = true }, TestContext.Current.CancellationToken);
        Assert.Equal(target.ToString(), siteNode.Name);
    }

    [Fact]
    //[Fact(Skip = "Hardcoded Site Id")]
    public async Task RenameSiteAsync()
    {
        var target = Guid.Parse("019d86fa-ede4-7408-8d24-2b3ae59b5dfb");

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);

        var site = await siteService.UpdateAsync(target, new SiteUpdateDescriptor
        {
            Name = "Rugged NUC 11"
        }, TestContext.Current.CancellationToken);
    }

    //[Fact]
    [Fact(Skip = "Alters Database")]
    public async Task FixDulicateVirtualNetworkIndicesAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        RunAsPrivileged(serviceScope);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var virtualNetworkGroups = (await dbContext
            .VirtualNetworks
            .IgnoreQueryFilters()
            .ToArrayAsync(TestContext.Current.CancellationToken))
            .GroupBy(g => g.WorkspaceId)
            .Where(g => g.Count() > 1)
            .ToArray();
        Assert.NotNull(virtualNetworkGroups);

        foreach (var vnetGroup in virtualNetworkGroups)
        {
            if (vnetGroup.Select(i => i.Index).Distinct().Count() != vnetGroup.Count())
            {
                // This vnetGroup has duplicates
                for (var x = 0; x < vnetGroup.Count(); x++)
                {
                    vnetGroup.ElementAt(x).Index = x;
                }
            }
        }

        if (dbContext.ChangeTracker.HasChanges())
        {
            await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        }
    }

    [Theory(Skip = "Hard-coded values used")]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public async Task QemuAgentExecAsync_ZeroTierCli_Info(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = CreatePVEClient(serviceScope, theoryConfiguration);

        var response = await pveClient.QemuAgentExecAsync("node03", 110, $"zerotier-cli info -j", TestContext.Current.CancellationToken);

        Assert.NotNull(response);
    }

    ////[Theory]
    //[Theory(Skip = "Hard-coded values used")]
    //[ClassData(typeof(TheoryConfigurationKeys))]
    //public async Task GetStatusAsync_FromVM(string theoryConfigurationKey)
    //{
    //    IServiceCollection serviceDescriptors = new ServiceCollection();
    //    using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfigurationKey);

    //    var service = serviceScope.ServiceProvider.GetRequiredService<IZeroTierService>();
    //    Assert.NotNull(service);

    //    var status = await service.GetNodeStatusAsync(theoryConfigurationKey, "node03", 110);
    //    Assert.NotNull(status);
    //    Assert.NotNull(status.Address);
    //    Assert.NotEmpty(status.Address);
    //}
    [Fact]
    public async Task ZeroTier_Delete_Offline_Orphan_Members_Async()
    {
        // Orphan members are registration in ZeroTier mgmt network that have not registration entry
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var zeroTierService = serviceScope.ServiceProvider.GetRequiredService<IZeroTierService>();
        var zeroTierOptions = serviceScope.ServiceProvider.GetRequiredService<IOptions<MDCEndpointServiceOptions>>();

        var registrations = await dbContext.SiteNodeRegistrations.ToListAsync(TestContext.Current.CancellationToken);
        var hashRegistrationMemberIds = registrations.Select(i => i.MemberAddress).ToHashSet();

        var siteNodes = await dbContext.SiteNodes.ToListAsync(TestContext.Current.CancellationToken);
        var hashSiteNodeMemberIds = siteNodes.Select(i => i.MemberAddress).ToHashSet();

        var members = await zeroTierService.GetManagementNetworkMembersAsync(TestContext.Current.CancellationToken);

        var offlineOrphanMembers = members.Where(i => i.NodeId != i.ControllerId && i.Online == 0 && i.LastOnline == 0 && !hashRegistrationMemberIds.Contains(i.NodeId) && !hashSiteNodeMemberIds.Contains(i.NodeId)).ToList();
        foreach (var member in offlineOrphanMembers)
        {
            await zeroTierService.DeleteNetworkMemberAsync(zeroTierOptions.Value.MgmtNetworkId, member.NodeId, TestContext.Current.CancellationToken);
        }
    }


    [Fact]
    public async Task ZeroTier_UpdateZeroTierNamesAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var zeroTierService = serviceScope.ServiceProvider.GetRequiredService<IZeroTierService>();
        var zeroTierOptions = serviceScope.ServiceProvider.GetRequiredService<IOptions<MDCEndpointServiceOptions>>();

        var siteNodes = await dbContext
            .SiteNodes
            .Include(i => i.Site)
            .AsNoTracking()
            .ToArrayAsync(TestContext.Current.CancellationToken);

        var members = await zeroTierService.GetNetworkMembersAsync(zeroTierOptions.Value.MgmtNetworkId, TestContext.Current.CancellationToken);

        foreach (var siteNode in siteNodes)
        {
            var member = members.FirstOrDefault(i => i.NodeId == siteNode.MemberAddress);

            if (member == null)
                continue;

            var name = $"{siteNode.Name} ({siteNode.Site?.Name})";
            var description = $"{siteNode.SerialNumber ?? siteNode.Id.ToString()}";
            if (member.Name == name && member.Description == description)
                continue;

      //      if (member.Online == 0) // Skip offline nodes
     //           continue;

            member = await zeroTierService.SetNetworkMemberNameAsync(
                zeroTierOptions.Value.MgmtNetworkId,
                member.NodeId,
                name,
                TestContext.Current.CancellationToken);

            member = await zeroTierService.SetNetworkMemberDescriptionAsync(
                zeroTierOptions.Value.MgmtNetworkId,
                member.NodeId,
                description,
                TestContext.Current.CancellationToken);
        }
    }
}
