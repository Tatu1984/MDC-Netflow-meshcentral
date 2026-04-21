using MDC.Core.Models;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using MDC.Shared.Models;
using System.Collections.Concurrent;
using System.Net;
using System.Text.Json.Nodes;


namespace MDC.Core.Services.Providers.DtoEnrichment;

internal class DtoEnrichmentService(IEnrichmentContext context, IZeroTierService zeroTierService, IMDCEndpointService mdcEndpointService, IPVEClientFactory pveClientFactory) : IDtoEnrichmentService
{
    public async Task EnrichAsync(IEnumerable<Workspace> workspaces, bool expand, CancellationToken cancellationToken)
    {
        await Task.WhenAll(workspaces.Select(workspaces => EnrichAsync(workspaces, expand, cancellationToken)));
    }

    public async Task EnrichAsync(Workspace workspace, bool expand, CancellationToken cancellationToken)
    {
        if (workspace.Site == null) throw new InvalidOperationException("Unable to Enrich Workspaace.   Site property does not exist!");

        await EnrichAsync(workspace.Site, expand, cancellationToken);
        if (!expand) return;

        var pveClient = await GetPveClient(workspace.Site, cancellationToken);
        if (pveClient == null) return;

        var datacenterSettings = await IPVEClientFactory_GetDatacenterSettingsAsync(pveClient, cancellationToken);
        var pveResources = await IPVEClientFactory_GetClusterResourcesAsync(pveClient, cancellationToken);

        // Parse the PVE resources
        // List<VirtualMachineTemplateEntry> templateEntries = new List<VirtualMachineTemplateEntry>();
        var virtualMachines = new ConcurrentBag<VirtualMachine>();

        List<Task> tasks = new List<Task>();
        foreach (var resource in pveResources)
        {
            if (!resource.ParseMDCResource(out var isTemplate, out var workspaceAddress, out var resourceType, out var resourceIndex, out var resourceName)) continue;

            // Parse templates
            if (isTemplate == true) continue;
            //{
            //    templateEntries.Add(new VirtualMachineTemplateEntry
            //    {
            //        Name = resourceName!,
            //        Index = resourceIndex!.Value,
            //        ResourceType = resourceType!,
            //        PVEResource = resource
            //    });
            //    continue;
            //}

            if (workspaceAddress != workspace.Address || resourceIndex == null || resourceName == null) continue; // Skip resources that don't belong to this workspace or are invalid

            switch (resourceType)
            {
                case MDCHelper.MDCResourceType.VirtualMachine:
                    {                        
                        // Queue a task to create the VirtualMachine entry for tuple
                        tasks.Add(Task.Run(async () =>
                        {
                            var pveQemuStatusTask = IPVEClientFactory_GetQemuStatusCurrentAsync(pveClient, resource.Node!, resource.VmId!.Value, cancellationToken);
                            var pveQemuConfigTask = IPVEClientFactory_GetQemuConfigAsync(pveClient, resource.Node!, resource.VmId!.Value, cancellationToken);

                            await Task.WhenAll(pveQemuStatusTask, pveQemuConfigTask);

                            var pveQemuStatus = await pveQemuStatusTask;
                            var pveQemuConfig = await pveQemuConfigTask;

                            var networkInterfaces = (pveQemuStatus.Agent == 1 && pveQemuStatus.Qmpstatus != "stopped") ? await IPVEClientFactory_QemuAgentGetNetworkInterfacesAsync(pveClient, resource.Node!, resource.VmId!.Value, cancellationToken) : null;
                            MDCHelper.GetMDCTemplateForResource(resource, pveResources, out var templateResource, out var templateName, out var templateRevision);

                            virtualMachines.Add(new VirtualMachine
                            {
                                Index = resourceIndex.Value,
                                Name = resourceName,
                                Status = pveQemuStatus.Qmpstatus ?? "unknown",
                                Cores = pveQemuConfig?.Cores,
                                Memory = pveQemuConfig?.Memory,
                                TemplateName = templateName,
                                TemplateRevision = templateRevision,
                                Storage = (pveQemuConfig?.ParseStorage() ?? []).Select(i => new VirtualMachineStorage
                                {
                                    ControllerType = i.ControllerType,
                                    ControllerIndex = i.ControllerIndex,
                                    Size = i.GetSize()
                                }).ToArray(),
                                NetworkAdapters = pveQemuConfig?.ParseNetworkAdapters().Select(networkDevice => new VirtualMachineNetworkAdapter
                                {
                                    Name = networkDevice.DeviceId,
                                    IsDisconnected = networkDevice.IsDisconnected ?? false,
                                    IsFirewallEnabled = networkDevice.IsFirewallEnabled ?? false,
                                    MACAddress = networkDevice.MACAddress,
                                    VirtualNetworkId = workspace.VirtualNetworks.FirstOrDefault(vn => vn.Tag == networkDevice.Tag)?.Id,
                                    NetworkInterfaces = networkInterfaces?
                                    .Select(ni => new VirtualMachineNetworkInterface
                                    {
                                        Name = ni.Name,
                                        MACAddress = ni.MACAddress,
                                        IPAddress = ni.IPAddress?.ToString(),
                                        Prefix = ni.Prefix
                                    })
                                    .ToArray()
                                })
                                .ToArray()
                            });
                        }, cancellationToken));
                        break;
                    }
                case MDCHelper.MDCResourceType.Gateway:
                    {
                        var vnet = workspace.VirtualNetworks.FirstOrDefault(vn => vn.Name == resourceName);
                        if (vnet == null) continue;  // NOTE: vnet is null when the gateway VM exists but does not exist in the database.  This can only be done by a person manually creating this VM on the target system.
                        if (vnet.Index != resourceIndex.Value) continue;    // NOTE: the only way the vnet Index and resourceIndex do not match is when a personal manually changes the name of a VM on the target system.

                        // Queue a task to set the GatewayStatus property
                        tasks.Add(Task.Run(async () =>
                        {
                            MDCHelper.GetMDCTemplateForResource(resource, pveResources, out var templateResource, out var templateName, out var templateRevision);

                            var pveQemuStatusTask = IPVEClientFactory_GetQemuStatusCurrentAsync(pveClient, resource.Node!, resource.VmId!.Value, cancellationToken);
                            var pveQemuConfigTask = IPVEClientFactory_GetQemuConfigAsync(pveClient, resource.Node!, resource.VmId!.Value, cancellationToken);

                            await Task.WhenAll(pveQemuStatusTask, pveQemuConfigTask);

                            var pveQemuStatus = await pveQemuStatusTask;
                            var pveQemuConfig = await pveQemuConfigTask;

                            vnet.GatewayStatus = pveQemuStatus?.Qmpstatus;
                            vnet.TemplateName = templateName;
                            vnet.TemplateRevision = templateRevision;

                            if (pveQemuConfig != null)
                            {
                                vnet.Cores = pveQemuConfig.Cores;
                                vnet.Memory = pveQemuConfig.Memory;

                                var (wanNetworkAdapter, lanNetworkAdapter) = pveQemuConfig.ParseGatewayNetworkAdapters();
                                if (wanNetworkAdapter != null)
                                {
                                    if (wanNetworkAdapter.Bridge == datacenterSettings.WanBridgeName && wanNetworkAdapter.Tag == datacenterSettings.WanBridgeTag)
                                    {
                                        vnet.GatewayWANNetworkType = VirtualNetworkGatewayWANNetworkType.Egress;
                                    }
                                    else if (wanNetworkAdapter.Bridge == datacenterSettings.LanBridgeName && wanNetworkAdapter.Tag >= datacenterSettings.MinVirtualNetworkTag)
                                    {
                                        vnet.GatewayWANNetworkType = VirtualNetworkGatewayWANNetworkType.Internal;
                                    }
                                    else if (wanNetworkAdapter.Bridge == datacenterSettings.PublicBridgeName && wanNetworkAdapter.Tag == datacenterSettings.PublicBridgeTag)
                                    {
                                        vnet.GatewayWANNetworkType = VirtualNetworkGatewayWANNetworkType.Public;
                                    }
                                    else
                                    {
                                        throw new InvalidOperationException($"Invalid WAN network assignment for Virtual Network {vnet.Name} having Bridge='wanNetworkAdapter.Bridge' and Tag='{wanNetworkAdapter.Tag}'");
                                    }
                                }
                            }
                            
                        }, cancellationToken));
                        break;
                    }
            }
        }

        await Task.WhenAll(tasks);
        workspace.VirtualMachines = virtualMachines.ToArray();
    }

    public async Task EnrichAsync(IEnumerable<Site> sites, bool expand, CancellationToken cancellationToken)
    {
        await Task.WhenAll(sites.Select(site => EnrichAsync(site, expand, cancellationToken)));
    }

    public async Task EnrichAsync(Site site, bool expand, CancellationToken cancellationToken)
    {
        await Task.WhenAll(site.SiteNodes.Select(siteNode => EnrichAsync(site, siteNode, expand, cancellationToken)));
        if (!expand) return;

        var pveClient = await GetPveClient(site, cancellationToken);
        if (pveClient == null) return;
        
        var nodeStatuses = await IPVEClientFactory_GetNodeStatusAsync(pveClient, cancellationToken);

        var pveResources = await IPVEClientFactory_GetClusterResourcesAsync(pveClient, cancellationToken);

        List<VirtualMachineTemplateEntry> templateEntries = new List<VirtualMachineTemplateEntry>();

        foreach (var resource in pveResources)
        {
            if (!resource.ParseMDCResource(out var isTemplate, out var workspaceAddress, out var resourceType, out var resourceIndex, out var resourceName)) continue;

            // Parse templates
            if (isTemplate == true)
            {
                templateEntries.Add(new VirtualMachineTemplateEntry
                {
                    Name = resourceName!,
                    Index = resourceIndex!.Value,
                    ResourceType = resourceType!,
                    PVEResource = resource
                });
                continue;
            }
        }

        await Task.WhenAll(templateEntries
            .Select(async re => re.PVEQemuConfig =
                await context.GetOrAdd($"IPVEClientFactory:GetQemuConfigAsync:{re.PVEResource!.Node!},{re.PVEResource.VmId!.Value}", async token => await pveClient.GetQemuConfigAsync(re.PVEResource!.Node!, re.PVEResource.VmId!.Value, token)).GetValueAsync(cancellationToken)
            ));

        site.ClusterName = nodeStatuses.Select(i => i.Item1).GetClusterNode().Name;
        site.GatewayTemplates = templateEntries
            .Where(i => i.ResourceType == MDCHelper.MDCResourceType.Gateway)
            .Select(entry => new VirtualMachineTemplate
            {
                Name = entry.Name!,
                Revision = entry.Index!.Value,
                Cores = entry.PVEQemuConfig?.Cores,
                Memory = entry.PVEQemuConfig?.Memory,
                Storage = (entry.PVEQemuConfig?.ParseStorage() ?? []).Select(i => new VirtualMachineStorage
                {
                    ControllerType = i.ControllerType,
                    ControllerIndex = i.ControllerIndex,
                    Size = i.GetSize()
                })
                .ToArray()
            })
            .ToArray();
        site.VirtualMachineTemplates = templateEntries
            .Where(i => i.ResourceType == MDCHelper.MDCResourceType.VirtualMachine)
            .Select(entry => new VirtualMachineTemplate
            {
                Name = entry.Name!,
                Revision = entry.Index!.Value,
                Cores = entry.PVEQemuConfig?.Cores,
                Memory = entry.PVEQemuConfig?.Memory,
                Storage = (entry.Storage ?? []).Select(i => new VirtualMachineStorage
                {
                    ControllerType = i.ControllerType,
                    ControllerIndex = i.ControllerIndex,
                    Size = i.GetSize()
                })
                .ToArray()
            })
            .ToArray();
    }

    public async Task EnrichAsync(Site site, SiteNode siteNode, bool expand, CancellationToken cancellationToken)
    {
        var members = await IZeroTierService_GetManagementNetworkMembersAsync(cancellationToken);

        var member = members.FirstOrDefault(member => member.NodeId == siteNode.MemberAddress);
        siteNode.Online = member?.Online == null ? null : member?.Online != 0;
        siteNode.Authorized = member?.Config?.Authorized;

        if (!expand) return;

        if (siteNode.DeviceInfo != null)
        {
            var deviceInfo = JsonObject.Parse(siteNode.DeviceInfo);
            var dmiSystemName = deviceInfo?["dmi"]?["system"]?["name"]?.GetValue<string>();
            siteNode.SystemName = dmiSystemName;
        }

        // From PVE
        //  HostName = null,
        //  CPUInfo = null,
        //  Storage
        var pveClient = await GetPveClient(site, cancellationToken);
        if (pveClient == null) return;

        var nodeStatuses = await IPVEClientFactory_GetNodeStatusAsync(pveClient, cancellationToken);
        var pveNodeStatus = nodeStatuses.FirstOrDefault(i => i.node.Name == siteNode.Name).status;

        var pveResources = await IPVEClientFactory_GetClusterResourcesAsync(pveClient, cancellationToken);

        siteNode.CPUInfo = pveNodeStatus == null ? null :
            new SiteNodeCPUInfo
            {
                Cores = pveNodeStatus.CPUInfo.Cores,
                CPUs = pveNodeStatus.CPUInfo.CPUs,
                MHZ = pveNodeStatus.CPUInfo.MHZ,
                Model = pveNodeStatus.CPUInfo.Model,
                Sockets = pveNodeStatus.CPUInfo.Sockets
            };
        siteNode.HostName = nodeStatuses.FirstOrDefault(i => i.node.Name == siteNode.Name).node.Name;
        siteNode.Storage = pveResources.Where(i => i.Type == PVEResourceType.Storage && (i.Content ?? string.Empty).Split(',').Contains("images")).Select(pveResource => new SiteNodeStorageInfo
        {
            Disk = pveResource.Disk,
            MaxDisk = pveResource.MaxDisk
        }).FirstOrDefault();
        siteNode.Memory = pveNodeStatus == null ? null :
            new SiteNodeMemoryInfo
            {
                Used = pveNodeStatus.Memory.Used,
                Total = pveNodeStatus.Memory.Total,
                Free = pveNodeStatus.Memory.Free
            };
        siteNode.CPU = pveNodeStatus?.CPU;
    }

    public async Task EnrichAsync(WorkspaceDescriptor workspaceDescriptor, Workspace workspace, CancellationToken cancellationToken)
    {
        if (workspace.Site == null) throw new InvalidOperationException("Unable to Enrich Workspaace.   Site property does not exist!");

        // Enrich workspaceDescriptor with ZeroTier data source
        foreach (var descriptorVirtualNetwork in workspaceDescriptor.VirtualNetworks ?? [])
        {
            var vnet = workspace.VirtualNetworks.FirstOrDefault(i => i.Name == descriptorVirtualNetwork.Name);
            if (vnet == null) continue;
            if (vnet.ZeroTierNetworkId == null) continue;

            var network = await zeroTierService.GetNetworkByIdAsync(vnet.ZeroTierNetworkId, cancellationToken);
            if (network == null) continue;

            descriptorVirtualNetwork.RemoteNetworkAddressCIDR = network.Config.Routes.FirstOrDefault()?.Target;
            descriptorVirtualNetwork.RemoteNetworkIPRangeStart = network.Config.IpAssignmentPools.FirstOrDefault()?.IPRangeStart;
            descriptorVirtualNetwork.RemoteNetworkIPRangeEnd = network.Config.IpAssignmentPools.FirstOrDefault()?.IPRangeEnd;
        }

        foreach (var descriptorVirtualMachine in workspaceDescriptor.VirtualMachines ?? [])
        {
            var vm = workspace.VirtualMachines?.FirstOrDefault(i => i.Name == descriptorVirtualMachine.Name);
            if (vm == null) continue;

            foreach (var descriptorVMNetworkAdapter in descriptorVirtualMachine.NetworkAdapters ?? [])
            {
                var na = vm.NetworkAdapters?.FirstOrDefault(i => i.Name == descriptorVMNetworkAdapter.Name);
                if (na == null) continue;

                // Get the first zeroTier IPv4 address for this network interface
                var networkInterface = na.NetworkInterfaces?.FirstOrDefault(i => i.Name.StartsWith("zt") && IPAddress.TryParse(i.IPAddress, out var address) && address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);
                if (networkInterface != null)
                {
                    descriptorVMNetworkAdapter.EnableRemoteNetwork = networkInterface != null;
                    descriptorVMNetworkAdapter.RemoteNetworkIPAddress = networkInterface?.IPAddress;
                }
            }
        }

        //var pveClient = await GetPveClient(workspace.Site, cancellationToken);
        //if (pveClient == null) return;

        //var datacenterSettings = await pveClient.GetDatacenterSettingsAsync(cancellationToken);

        //foreach (var descriptorVirtualNetwork in workspaceDescriptor.VirtualNetworks ?? [])
        //{
        //    var vnet = workspace.VirtualNetworks.FirstOrDefault(i => i.Name ==  descriptorVirtualNetwork.Name);
        //    if (vnet == null) continue;

        //    if (descriptorVirtualNetwork.Gateway != null)
        //    {
        //        if (vnet.Tag == datacenterSettings.WanBridgeTag)
        //        descriptorVirtualNetwork.Gateway.WANNetworkType
        //    }
        //}




        //var pveResources = await IPVEClientFactory_GetClusterResourcesAsync(pveClient, cancellationToken);

        //// Parse the PVE resources
        //List<VirtualMachineTemplateEntry> templateEntries = new List<VirtualMachineTemplateEntry>();
        //var virtualMachines = new ConcurrentBag<VirtualMachineDescriptor>();

        //List<Task> tasks = new List<Task>();
        //foreach (var resource in pveResources)
        //{
        //    if (!resource.ParseMDCResource(out var isTemplate, out var workspaceAddress, out var resourceType, out var resourceIndex, out var resourceName)) continue;

        //    // Parse templates
        //    if (isTemplate == true)
        //    {
        //        templateEntries.Add(new VirtualMachineTemplateEntry
        //        {
        //            Name = resourceName!,
        //            Index = resourceIndex!.Value,
        //            ResourceType = resourceType!,
        //            PVEResource = resource,
        //        });
        //        continue;
        //    }

        //    if (workspaceAddress != workspace.Address || resourceIndex == null || resourceName == null) continue; // Skip resources that don't belong to this workspace or are invalid

        //    switch (resourceType)
        //    {
        //        case MDCHelper.MDCResourceType.Gateway:
        //            {
        //                //var vnet = workspace.VirtualNetworks.FirstOrDefault(vn => vn.Name == resourceName);
        //                //if (vnet == null) continue;  // NOTE: vnet is null when the gateway VM exists but does not exist in the database.  This can only be done by a person manually creating this VM on the target system.
        //                //if (vnet.Index != resourceIndex.Value) continue;    // NOTE: the only way the vnet Index and resourceIndex do not match is when a personal manually changes the name of a VM on the target system.

        //                //// Queue a task to set the GatewayStatus property
        //                //tasks.Add(Task.Run(async () => vnet.GatewayStatus = (await IPVEClientFactory_GetQemuStatusCurrentAsync(pveClient, resource.Node!, resource.VmId!.Value, cancellationToken))?.Qmpstatus, cancellationToken));
        //                break;
        //            }
        //    }
        //}

        //await Task.WhenAll(tasks);
    }

    public async Task EnrichAsync(IEnumerable<SiteNodeRegistration> siteNodeRegistrations, CancellationToken cancellationToken)
    {
        var members = await IZeroTierService_GetManagementNetworkMembersAsync(cancellationToken);
        if (members != null)
        {
            var dictMembers = members.ToDictionary(i => i.NodeId);
            foreach (var siteNodeRegistration in siteNodeRegistrations)
            {
                if (siteNodeRegistration.MemberAddress == null)
                    continue;
                var member = dictMembers!.GetValueOrDefault(siteNodeRegistration.MemberAddress);
                siteNodeRegistration.Online = member == null || member.Online == null ? false : member.Online.Value > 0;
                siteNodeRegistration.Authorized = member == null ? null : member.Config.Authorized;
            }
        }
    }

    public async Task EnrichAsync(IEnumerable<RemoteNetwork> remoteNetworks, CancellationToken cancellationToken)
    {
        await Task.WhenAll(remoteNetworks.Select(remoteNetwork => EnrichAsync(remoteNetwork, cancellationToken)));
    }

    /// <summary />
    public async Task EnrichAsync(RemoteNetwork remoteNetwork, CancellationToken cancellationToken)
    {
        if (remoteNetwork.NetworkId == null)
            return;

        // Convert virtualNetwork.ZeroTierNetworkId to 16 digit hex string containing the last 8 bytes of the Guid
        remoteNetwork.Id = Guid.ParseExact(new string('0', 16) + remoteNetwork.NetworkId, "N");

        var networks = await IZeroTierService_GetNetworksAsync(cancellationToken);
        networks.TryGetValue(remoteNetwork.NetworkId, out var ztNetwork);  // Note: database could specify a zerotier network that does not exist

        ZTMember[]? ztMembers = null;
        if (ztNetwork == null)
            return;

        remoteNetwork.Name = ztNetwork.Config.Name;
        remoteNetwork.IPAssignmentPools = (ztNetwork.Config.IpAssignmentPools ?? []).Select(i => new RemoteNetworkIPAssignmentPool { IPRangeEnd = i.IPRangeEnd, IPRangeStart = i.IPRangeStart }).ToArray();
        remoteNetwork.ManagedRoutes = (ztNetwork.Config.Routes ?? []).Select(i => new RemoteNetworkRoute { Target = i.Target, Via = i.Via }).ToArray();

        ztMembers = await IZeroTierService_GetNetworkMembersAsync(ztNetwork.Id, cancellationToken);

        remoteNetwork.Members = (ztMembers ?? []).Select(i => new RemoteNetworkMember
        {
            Id = i.NodeId,
            Description = i.Description,
            Name = i.Name,
            Online = i.Online > 0,
            Authorized = i.Config.Authorized,
            IPAddresses = i.Config.IPAssignments,
            ClientVersion = i.ClientVersion,
            Latency = i.Latency,
            PhyiscalIPAddress = i.PhysicalAddress,
            Created = DateTimeOffset.FromUnixTimeMilliseconds(i.Config.CreationTime),
            LastOnline = i.LastOnline == null ? null : DateTimeOffset.FromUnixTimeMilliseconds(i.LastOnline.Value)
        }).ToArray();
    }


    #region
    private async Task<IPVEClientService?> GetPveClient(Site site, CancellationToken cancellationToken)
    {
        var members = await IZeroTierService_GetManagementNetworkMembersAsync(cancellationToken);
        var mdcEndpoint = mdcEndpointService.CreateMicroDataCenterEndpoint(members, site);
        if (mdcEndpoint == null) return null;

        return pveClientFactory.Create(mdcEndpoint);
    }

    private Task<ZTMember[]> IZeroTierService_GetManagementNetworkMembersAsync(CancellationToken cancellationToken) => context.GetOrAdd($"IZeroTierService:GetManagementNetworkMembersAsync", async token => await zeroTierService.GetManagementNetworkMembersAsync(token)).GetValueAsync(cancellationToken);

    private Task<ZTMember[]> IZeroTierService_GetNetworkMembersAsync(string networkId, CancellationToken cancellationToken) => context.GetOrAdd($"IZeroTierService:GetNetworkMembersAsync({networkId})", async token => await zeroTierService.GetNetworkMembersAsync(networkId, token)).GetValueAsync(cancellationToken);

    private Task<Dictionary<string, ZTNetwork>> IZeroTierService_GetNetworksAsync(CancellationToken cancellationToken) => context.GetOrAdd($"IZeroTierService:GetNetworksAsync", async token => (await zeroTierService.GetNetworksAsync(token)).ToDictionary(i => i.Id)).GetValueAsync(cancellationToken);

    private Task<PVEClusterStatus[]> IPVEClientFactory_GetClusterStatusAsync(IPVEClientService pveClient, CancellationToken cancellationToken) => context.GetOrAdd($"IPVEClientFactory.{pveClient.Instance}:GetClusterStatusAsync", async token => await pveClient.GetClusterStatusAsync(token)).GetValueAsync(cancellationToken);

    private Task<DatacenterSettings> IPVEClientFactory_GetDatacenterSettingsAsync(IPVEClientService pveClient, CancellationToken cancellationToken) => context.GetOrAdd($"IPVEClientFactory.{pveClient.Instance}:GetDatacenterSettingsAsync", async token => await pveClient.GetDatacenterSettingsAsync(token)).GetValueAsync(cancellationToken);

    private Task<IEnumerable<PVEResource>> IPVEClientFactory_GetClusterResourcesAsync(IPVEClientService pveClient, CancellationToken cancellationToken) => context.GetOrAdd($"IPVEClientFactory.{pveClient.Instance}:GetClusterResourcesAsync", async token => await pveClient.GetClusterResourcesAsync(token)).GetValueAsync(cancellationToken);

    private Task<PVENodeStatus> IPVEClientFactory_GetNodeStatusAsync(IPVEClientService pveClient, string node, CancellationToken cancellationToken) => context.GetOrAdd($"IPVEClientFactory.{pveClient.Instance}:GetNodeStatusAsync({node})", async token => await pveClient.GetNodeStatusAsync(node, token)).GetValueAsync(cancellationToken);

    private Task<(PVEClusterStatus node, PVENodeStatus? status)[]> IPVEClientFactory_GetNodeStatusAsync(IPVEClientService pveClient, CancellationToken cancellationToken)
    {
        return context.GetOrAdd($"IPVEClientFactory.{pveClient.Instance}:GetNodeStatusAsync", async token =>
        {
            var clusterStatus = await IPVEClientFactory_GetClusterStatusAsync(pveClient, cancellationToken);
            return await Task.WhenAll(clusterStatus.Select(async node =>
                        (node, status: node.Type == PVEClusterStatusType.Node ? (
                            await IPVEClientFactory_GetNodeStatusAsync(pveClient,node.Name,cancellationToken)
                        ) : null)
                    ));

        }).GetValueAsync(cancellationToken);        
    }

    //await pveClient.GetQemuStatusCurrentAsync(entry.PVEResource!.Node!, entry.PVEResource!.VmId!.Value, cancellationToken);
    private Task<PVEQemuStatus> IPVEClientFactory_GetQemuStatusCurrentAsync(IPVEClientService pveClient, string node, int vmid, CancellationToken cancellationToken) => context.GetOrAdd($"IPVEClientFactory.{pveClient.Instance}:GetQemuStatusCurrentAsync({node},{vmid})", async token => await pveClient.GetQemuStatusCurrentAsync(node, vmid, token)).GetValueAsync(cancellationToken);

    //await pveClient.GetQemuConfigAsync(entry.PVEResource!.Node!, entry.PVEResource!.VmId!.Value, cancellationToken));
    private Task<PVEQemuConfig?> IPVEClientFactory_GetQemuConfigAsync(IPVEClientService pveClient, string node, int vmid, CancellationToken cancellationToken) => context.GetOrAdd($"IPVEClientFactory.{pveClient.Instance}:GetQemuConfigAsync({node},{vmid})", async token => await pveClient.GetQemuConfigAsync(node, vmid, token)).GetValueAsync(cancellationToken);

    // await pveClient.QemuAgentGetNetworkInterfacesAsync(entry.PVEResource!.Node!, entry.PVEResource!.VmId!.Value, cancellationToken);
    private Task<PVEQemuAgentNetworkInterface[]?> IPVEClientFactory_QemuAgentGetNetworkInterfacesAsync(IPVEClientService pveClient, string node, int vmid, CancellationToken cancellationToken) => context.GetOrAdd($"IPVEClientFactory.{pveClient.Instance}:QemuAgentGetNetworkInterfacesAsync({node},{vmid})", async token => await pveClient.QemuAgentGetNetworkInterfacesAsync(node, vmid, token)).GetValueAsync(cancellationToken);
    #endregion

}
