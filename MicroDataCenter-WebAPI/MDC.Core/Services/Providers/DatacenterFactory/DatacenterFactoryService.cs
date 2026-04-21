using MDC.Core.Models;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Net.WebSockets;

namespace MDC.Core.Services.Providers.DatacenterFactory;

internal class DatacenterFactoryService(IMDCDatabaseService databaseService, IMDCEndpointService mdcEndpointService, ILogger<DatacenterFactoryService> logger, IPVEClientFactory pveClientFactory) : IDatacenterFactoryService
{
    public async Task ImportSiteAsync(DbSiteNode dbSiteNode, Guid organizationId, CancellationToken cancellationToken = default)
    {
        if (dbSiteNode.Site == null) throw new InvalidOperationException($"Unable to find Site record for SiteNode.");

        logger.LogInformation("Importing Site '{siteName}' using Site Node '{siteNodeName}' to Organization Id '{organizationId}'.", dbSiteNode.Site.Name, dbSiteNode.Name, organizationId);

        var mdcEndpoint = await mdcEndpointService.GetMicroDataCenterEndpointAsync(dbSiteNode.MemberAddress, dbSiteNode.Site.ApiTokenId, dbSiteNode.Site.ApiTokenId, dbSiteNode.ApiPort, dbSiteNode.ApiValidateServerCertificate, cancellationToken);
        var pveClient = pveClientFactory.Create(mdcEndpoint);

        var pveResources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var datacenterSettings = await pveClient.GetDatacenterSettingsAsync(cancellationToken);

        var clusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
        var nodeStatuses = await Task.WhenAll(clusterStatus.Select(async node =>
             (node, status: node.Type == PVEClusterStatusType.Node ? (await pveClient.GetNodeStatusAsync(node.Name, cancellationToken)) : null)
         ));

        var datacenterEntry = pveResources.ToDatacenterEntry(pveClient, dbSiteNode.Site, datacenterSettings, nodeStatuses, true);

        // Populate Storage information for the Virtual Machine Template Entires
        await PopulateTemplateConfigurationAsync(pveClient, datacenterEntry, cancellationToken);
        await PopulateVirtualNetworkEntriesAsync(pveClient, datacenterEntry, cancellationToken);

        var dbCreatedWorkspaces = await databaseService.ImportWorkspacesAsync(dbSiteNode.SiteId, organizationId, datacenterEntry.Workspaces, cancellationToken);
        var dbCreatedVirtualNetworks = await databaseService.ImportVirtualNetworksAsync(datacenterEntry.Workspaces, cancellationToken);
    }

    // Load Datacenter information for a single Site
    public async Task<DatacenterEntry> GetDatacenterEntryAsync(DbSite dbSite, CancellationToken cancellationToken = default)
    {
        var pveClients = await mdcEndpointService.CreatePVEClientsAsync(dbSite, 30, cancellationToken);
        var pveClient = pveClients.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available for Site Id '{dbSite.Id}'.");

        var pveResources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var datacenterSettings = await pveClient.GetDatacenterSettingsAsync(cancellationToken);
        
        var clusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
        var nodeStatuses = await Task.WhenAll(clusterStatus.Select(async node =>
            (node, status: node.Type == PVEClusterStatusType.Node ? (await pveClient.GetNodeStatusAsync(node.Name, cancellationToken)) : null)
        ));

        var datacenterEntry = pveResources.ToDatacenterEntry(pveClient, dbSite, datacenterSettings, nodeStatuses, false);

        // Populate Storage information for the Virtual Machine Template Entires
        await PopulateTemplateConfigurationAsync(pveClient, datacenterEntry, cancellationToken);

        return datacenterEntry;
    }

    public async Task<DatacenterEntry> GetDatacenterEntryByWorkspaceIdAsync(Guid workspaceId, bool populateDatacenterTemplates = false, CancellationToken cancellationToken = default)
    {
        var dbWorkspace = await databaseService.GetWorkspaceByIdAsync(workspaceId, cancellationToken) ?? throw new KeyNotFoundException($"Workspace Id '{workspaceId}' not found.");

        var dbSite = dbWorkspace.Site;
        if (dbSite == null)
            throw new InvalidOperationException($"Unable to retrieve Site for Workspace Id '{workspaceId}'.");

        var mdcEndpoints = await mdcEndpointService.GetMicroDataCenterEndpointsAsync(dbSite, cancellationToken);
        var mdcEndpoint = mdcEndpoints.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available to Site for Workspace Id '{workspaceId}'.");
        
        var pveClient = pveClientFactory.Create(mdcEndpoint);

        var pveResources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var datacenterSettings = await pveClient.GetDatacenterSettingsAsync(cancellationToken);

        var clusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
        var nodeStatuses = await Task.WhenAll(clusterStatus.Select(async node =>
            (node, status: node.Type == PVEClusterStatusType.Node ? (await pveClient.GetNodeStatusAsync(node.Name, cancellationToken)) : null)
        ));

        var datacenterEntry = pveResources.ToDatacenterEntry(pveClient, dbWorkspace, datacenterSettings, nodeStatuses);

        // Populate Storage information for the Virtual Machine Template Entires
        if (populateDatacenterTemplates)
            await PopulateTemplateConfigurationAsync(pveClient, datacenterEntry, cancellationToken);

        await PopulateVirtualNetworkEntriesAsync(pveClient, datacenterEntry, cancellationToken);

        return datacenterEntry;
    }

    public async Task<VNCSession> CreateVNCProxyAsync(Guid workspaceId, int virtualMachineIndex, CancellationToken cancellationToken = default)
    {
        var dbWorkspace = await databaseService.GetWorkspaceByIdAsync(workspaceId, cancellationToken);
        if (dbWorkspace == null)
        {
            throw new KeyNotFoundException($"Workspace Id '{workspaceId}' not found.");
        }

        var dbSite = dbWorkspace.Site;
        if (dbSite == null)
            throw new InvalidOperationException($"Unable to retrieve Site for Workspace Id '{workspaceId}'.");

        var mdcEndpoints = await mdcEndpointService.GetMicroDataCenterEndpointsAsync(dbSite, cancellationToken);
        var mdcEndpoint = mdcEndpoints.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available to Site for Workspace Id '{workspaceId}'.");
        
        var pveClient = pveClientFactory.Create(mdcEndpoint);

        var pveResources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var datacenterSettings = await pveClient.GetDatacenterSettingsAsync(cancellationToken);

        var clusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
        var nodeStatuses = await Task.WhenAll(clusterStatus.Select(async node =>
            (node, status: node.Type == PVEClusterStatusType.Node ? (await pveClient.GetNodeStatusAsync(node.Name, cancellationToken)) : null)
        ));

        var datacenterEntry = pveResources.ToDatacenterEntry(pveClient, dbWorkspace, datacenterSettings, nodeStatuses);

        var workspaceEntry = datacenterEntry.Workspaces.FirstOrDefault(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry == null)
        {
            throw new InvalidOperationException("Workspace Not Found");
        }

        PVEResource? resource = null;

        var vmEntry = workspaceEntry.VirtualMachines.FirstOrDefault(vm => vm.Index == virtualMachineIndex) ?? throw new InvalidOperationException($"Virtual Machine Index '{virtualMachineIndex}' not found in Workspace Id '{workspaceId}'");
        resource = vmEntry.PVEResource;

        if (resource == null)
        {
            throw new InvalidOperationException($"Virtual Machine resource not found for Workspace Id '{workspaceId}'.");
        }

        // Always request password
        var vncProxy = await pveClient.CreateVNCProxyAsync(resource.Node!, resource.VmId!.Value, true, cancellationToken);

        var path = $"/api2/json/nodes/{resource.Node!}/qemu/{resource.VmId!.Value}/vncwebsocket?port={vncProxy.Port}&vncticket={Uri.EscapeDataString(vncProxy.Ticket)}";

        var url = mdcEndpoint.PVEClientConfiguration.ProxyBaseUrl == null ? $"wss://{mdcEndpoint.PVEClientConfiguration.Host}:{mdcEndpoint.PVEClientConfiguration.Port}{path}" : $"{mdcEndpoint.PVEClientConfiguration.ProxyBaseUrl.Replace("http", "ws").TrimEnd('/')}{path}";

        var ws = new ClientWebSocket();
        ws.Options.SetRequestHeader("Authorization", $"{mdcEndpoint.PVEClientConfiguration.AuthenticationScheme}={mdcEndpoint.PVEClientConfiguration.TokenId}={mdcEndpoint.PVEClientConfiguration.Secret}");
        if (mdcEndpoint.PVEClientConfiguration.ProxyBaseUrl != null)
        {
            ws.Options.SetRequestHeader("X-Proxmox-Host", mdcEndpoint.PVEClientConfiguration.Host.ToString());
            ws.Options.SetRequestHeader("X-Proxmox-Port", mdcEndpoint.PVEClientConfiguration.Port.ToString());
        }

        if (!mdcEndpoint.PVEClientConfiguration.ValidateServerCertificate)
        {
            ws.Options.RemoteCertificateValidationCallback += (sender, certificate, chain, sslPolicyErrors) => true;
        }

        return new VNCSession
        {
            ClientWebSocket = ws,
            Url = url,
            Password = vncProxy.Password
        };
    }

    public async Task SetWorkspaceLockAsync(Guid workspaceId, bool locked, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await GetDatacenterEntryByWorkspaceIdAsync(workspaceId, false, cancellationToken);
        var workspaceEntry = datacenterEntry.Workspaces.FirstOrDefault(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry == null)
        {
            throw new InvalidOperationException("Workspace Not Found");
        }

        var vmids = workspaceEntry.VirtualMachines.Select(i => i.PVEResource!.VmId!.Value)
            .Concat(workspaceEntry.VirtualNetworks.Where(i => i.PVEResource != null).Select(i => i.PVEResource!.VmId!.Value))
            .ToList();

        var existingAcl = await datacenterEntry.PVEClient.GetAccessControlListAsync(cancellationToken);
        
        if (locked)
        {
            var canLock = await mdcEndpointService.CanLockWorkspaces(datacenterEntry.PVEClient, cancellationToken);
            if (!canLock) throw new InvalidOperationException($"Workspace lock feature is not available for this Site.   Site update required.");

            // Set the lock in the database first, then lock the VMs
            workspaceEntry.DbWorkspace!.Locked = true;
            await databaseService.SetWorkspaceLockAsync(workspaceEntry.DbWorkspace!.Id, true, cancellationToken);

            foreach (var vmid in vmids)
            {
                await datacenterEntry.PVEClient.UpdateAccessControlListAsync($"/vms/{vmid}", [MDCConstants.PVE_LockRoleId], [MDCConstants.PVE_ApiGroupId], null, cancellationToken);
            }
        }
        else
        {
            foreach (var vmid in vmids)
            {
                var path = $"/vms/{vmid}";
                var lockedAcl = existingAcl.FirstOrDefault(i => i.Path == path && i.RoleId == MDCConstants.PVE_LockRoleId && i.UserGroupId == MDCConstants.PVE_ApiGroupId);
                if (lockedAcl != null)
                {
                    await datacenterEntry.PVEClient.DeleteAccessControlListAsync(path, [MDCConstants.PVE_LockRoleId], [MDCConstants.PVE_ApiGroupId], cancellationToken);
                }
            }

            await databaseService.SetWorkspaceLockAsync(workspaceEntry.DbWorkspace!.Id, false, cancellationToken);
        }
    }

    private static async Task PopulateTemplateConfigurationAsync(IPVEClientService pveClient, DatacenterEntry datacenterEntry, CancellationToken cancellationToken = default)
    {
        // Populate Storage information for the Virtual Machine Template Entires
        var templateEntries = datacenterEntry.GatewayTemplates
            .Concat(datacenterEntry.VirtualMachineTemplates);
        _ = await QueryQemuConfigsAsync(pveClient, templateEntries, cancellationToken);
        foreach (var virtualMachineTemplateEntry in templateEntries)
        {
            if (virtualMachineTemplateEntry.PVEQemuConfig == null || virtualMachineTemplateEntry.PVEResource == null || virtualMachineTemplateEntry.Storage != null) continue;    // Skip.  Note: This should never happen
            virtualMachineTemplateEntry.Storage = virtualMachineTemplateEntry.PVEQemuConfig.ParseStorage();
        }
    }

    private static async Task<PVEQemuConfig?[]> QueryQemuConfigsAsync(IPVEClientService pveClient, IEnumerable<ResourceEntry> resourceEntries, CancellationToken cancellationToken)
    {
        return await Task.WhenAll(resourceEntries
            .Select(async re => re.PVEQemuConfig = await pveClient.GetQemuConfigAsync(re.PVEResource!.Node!, re.PVEResource.VmId!.Value, cancellationToken))
        );
    }

    private static async Task PopulateVirtualNetworkEntriesAsync(IPVEClientService pveClient, DatacenterEntry datacenterEntry, CancellationToken cancellationToken = default)
    {
        // Populate Virtual Network Entries for Workspace Entries
        var resourceEntries = datacenterEntry.Workspaces.Where(i => i.Address >= datacenterEntry.DatacenterSettings.MinWorkspaceAddress)
            .SelectMany(
                entry => entry.ResourceEntries
                    .Where(re => re.PVEQemuConfig == null && re.PVEResource != null && re.PVEResource.Node != null && re.PVEResource.VmId.HasValue),
                (workspaceEntry, resourceEntry) => resourceEntry);
        _ = await QueryQemuConfigsAsync(pveClient, resourceEntries, cancellationToken);
        foreach (var workspaceEntry in datacenterEntry.Workspaces.Where(i => i.Address >= datacenterEntry.DatacenterSettings.MinWorkspaceAddress))
        {
            // Update the VirtualNetworkEntry Tag values based on the QemuConfig NetworkInterface and DbVirtualNetwork based on the Tag
            foreach (var virtualNetworkEntry in workspaceEntry.VirtualNetworks
                .Where(virtualNetworkEntry => virtualNetworkEntry.PVEResource != null && virtualNetworkEntry.PVEQemuConfig != null))
            {
                var (wanNetworkAdapter, lanNetworkAdapter) = virtualNetworkEntry.PVEQemuConfig!.ParseGatewayNetworkAdapters();

                // The lanNetworkAdapter Tag is expected to have a valid value
                //if (lanNetworkAdapter.Tag == null || lanNetworkAdapter.Tag.Value < minWorkspaceAddress)   // TODO: Get the minimum tag value from Datacenter Settings
                //    throw new InvalidOperationException($"Workspace '{workspaceEntry.Address}' Gateway Virtual Machine '{virtualNetworkEntry.PVEResource!.Name}' Network Adapter '{lanNetworkAdapter.DeviceId}' has invalid Tag value '{Convert.ToString(lanNetworkAdapter.Tag) ?? "<none>"}'.");

                // If the wanNetworkAdapter Tag has a value, it is expected to be valid
                if (wanNetworkAdapter != null
                    && !(
                        // Valid Egress WAN Tag
                        (wanNetworkAdapter.Bridge == datacenterEntry.DatacenterSettings.WanBridgeName && wanNetworkAdapter.Tag == datacenterEntry.DatacenterSettings.WanBridgeTag)
                        ||
                        // Valid Internal WAN tag
                        (wanNetworkAdapter.Bridge == datacenterEntry.DatacenterSettings.LanBridgeName && wanNetworkAdapter.Tag != null && wanNetworkAdapter.Tag.Value >= datacenterEntry.DatacenterSettings.MinVirtualNetworkTag)
                       )
                    )
                    // logger.LogError(new InvalidOperationException($"Workspace '{workspaceEntry.Address}' Gateway Virtual Machine '{virtualNetworkEntry.PVEResource!.Name}' Network Adapter '{wanNetworkAdapter.DeviceId}' has invalid Tag value '{Convert.ToString(wanNetworkAdapter.Tag) ?? "<none>"}'."), "Unexpected Virtual Machine Configuration");

                    if (virtualNetworkEntry.DbVirtualNetwork == null)   // *** REVISIT *** Note: This should never happen because DbVirtaulNetwork is created when the WorkspaceEntry is created
                    {
                        System.Diagnostics.Debugger.Break();
                    }
                
                // Set the Virtual Network Tag value here if dbVirtualNetwork has not been created yet
                virtualNetworkEntry.Tag ??= lanNetworkAdapter?.Tag;

                //if (virtualNetworkEntry.DbVirtualNetwork != null)
                //{
                //    System.Diagnostics.Debugger.Break();
                //}

                //// Note: When repopulating the datatabase, DbWorkspace will be null
                //virtualNetworkEntry.DbVirtualNetwork = workspaceEntry.DbWorkspace?.VirtualNetworks.FirstOrDefault(i => i.Tag == virtualNetworkEntry.Tag);
            }

            // Update the NetworkAdapter in the WorkspaceDescriptor for each of the VirtualMachines
            foreach (var virtualMachine in workspaceEntry.VirtualMachines.Where(i => i.PVEResource != null && i.PVEQemuConfig != null))
            {
                if (virtualMachine.VirtualMachineDescriptor == null) continue;  // Skip.  Note: This should never happen

                var networkAdapters = virtualMachine.PVEQemuConfig?.ParseNetworkAdapters(); // Force parsing of the config to populate the network adapters

                virtualMachine.VirtualMachineDescriptor.NetworkAdapters = networkAdapters?
                    .Select(na => new VirtualMachineNetworkAdapterDescriptor
                    {
                        Name = na.DeviceId,
                        IsDisconnected = na.IsDisconnected,
                        MACAddress = na.MACAddress,
                        IsFirewallEnabled = na.IsFirewallEnabled,
                        RefVirtualNetworkName = na.Tag == null ? null : workspaceEntry.VirtualNetworks.FirstOrDefault(vn => vn.Tag == na.Tag)?.Name,
                    })
                    .ToArray();
            }
        }
    }

    //public static VirtualNetwork[] ToVirtualNetworks(IEnumerable<VirtualNetworkEntry> virtualNetworkEntries)
    //{
    //    return virtualNetworkEntries
    //            .Where(entry => entry.DbVirtualNetwork != null && entry.DbVirtualNetwork.Id != Guid.Empty && entry.Name != null)
    //            .Select(entry => new VirtualNetwork
    //            {
    //                Id = entry.DbVirtualNetwork!.Id,
    //                Index = entry.DbVirtualNetwork.Index,
    //                Name = entry.Name!,
    //                Tag = entry.Tag,
    //                GatewayStatus = entry.DbVirtualNetwork!.Index == 0 ? entry.PVEQemuStatus?.Qmpstatus ?? "missing" : entry.PVEQemuStatus?.Qmpstatus,  // Primary Gateway must exist - GatewayStatus is "missing" when the gateway VM does not exist and index is 0.  When not primary gateway, GatewayStatus can be null when there is no gateway
    //                ZeroTierNetworkId = entry.DbVirtualNetwork.ZeroTierNetworkId,
    //                RemoteNetworkId = entry.DbVirtualNetwork.ZeroTierNetworkId == null ? null : Guid.ParseExact(new string('0', 16) + entry.DbVirtualNetwork.ZeroTierNetworkId, "N"), // Convert virtualNetwork.ZeroTierNetworkId to 16 digit hex string containing the last 8 bytes of the Guid
    //            })
    //            .ToArray();
    //}
}
