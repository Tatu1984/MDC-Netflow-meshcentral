using MDC.Core.Models;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;

namespace MDC.Core.Extensions;

internal static class PVEResourceExtensions
{
    public static bool ParseMDCResource(this PVEResource resource, out bool? isTemplate, out int? workspaceAddress, out string? type, out int? index, out string? name)
    {
        isTemplate = null;
        if (!MDCHelper.ParseMDCVirtualMachineName(resource.Name, resource.Template == true, out workspaceAddress, out type, out index, out name))
            return false;
        isTemplate = resource.Template == true;
        return true;
    }

    // Get detail from a single existing workspace
    public static DatacenterEntry ToDatacenterEntry(this IEnumerable<PVEResource> pveResources, IPVEClientService pveClient, DbWorkspace dbWorkspace, DatacenterSettings datacenterSettings, (PVEClusterStatus clusterStatus, PVENodeStatus? nodeStatus)[] nodeStatuses)
    {
        return ComputeDatacenterEntry(pveResources, pveClient, dbWorkspace.Site!, [dbWorkspace], datacenterSettings, nodeStatuses, false);
    }

    // Get DatacenterEntry for an entire site. Set discoverFromPveResource only when importing
    public static DatacenterEntry ToDatacenterEntry(this IEnumerable<PVEResource> pveResources, IPVEClientService pveClient, DbSite dbSite, DatacenterSettings datacenterSettings, (PVEClusterStatus clusterStatus, PVENodeStatus? nodeStatus)[] nodeStatuses, bool discoverFromPveResource)
    {
        return ComputeDatacenterEntry(pveResources, pveClient, dbSite, dbSite.Workspaces, datacenterSettings, nodeStatuses, discoverFromPveResource);
    }

    private static DatacenterEntry ComputeDatacenterEntry(IEnumerable<PVEResource> pveResources, IPVEClientService pveClient, DbSite dbSite, IEnumerable<DbWorkspace> dbWorkspaces, DatacenterSettings datacenterSettings, (PVEClusterStatus clusterStatus, PVENodeStatus? nodeStatus)[] nodeStatuses, bool discoverFromPveResource)
    {
        var resourceEntries = pveResources.ParsePVEResources(dbWorkspaces, discoverFromPveResource);
        //nodeStatuses.Select(i => i.clusterStatus).GetClusterNode();
        return new DatacenterEntry
        {
            PVEClient = pveClient,
            ClusterName = nodeStatuses.Select(i => i.clusterStatus).GetClusterNode().Name,
            DatacenterSettings = datacenterSettings,
            DbSite = dbSite,
            Description = string.Empty,
            Nodes = pveResources.Where(i => i.Type == PVEResourceType.Node).Select(i =>
            {
                var item = nodeStatuses.FirstOrDefault(j => j.clusterStatus.Name == i.Node);
                return new NodeEntry
                {
                    PVEResource = i,
                    PVENodeStatus = item.nodeStatus!,
                    PVEClusterStatus = item.clusterStatus
                };
            }).ToArray(),
            Storage = pveResources.Where(i => i.Type == PVEResourceType.Storage).ToArray(),
            Workspaces = resourceEntries.WorkspaceEntries,
            GatewayTemplates = resourceEntries.VirtualMachineTemplateEntries.Where(i => i.ResourceType == MDCHelper.MDCResourceType.Gateway).ToArray(),
            VirtualMachineTemplates = resourceEntries.VirtualMachineTemplateEntries.Where(i => i.ResourceType == MDCHelper.MDCResourceType.VirtualMachine).ToArray()
        };
    }

    public static (WorkspaceEntry[] WorkspaceEntries, VirtualMachineTemplateEntry[] VirtualMachineTemplateEntries) ParsePVEResources(this IEnumerable<PVEResource> pveResources, IEnumerable<DbWorkspace> dbWorkspaces, bool discoverFromPveResource)
    {
        // First pass, create the workspace entries from the dbWorkspaces
        Dictionary<int, WorkspaceEntry> workspaceEntries = new Dictionary<int, WorkspaceEntry>();
        foreach (var dbWorkspace in dbWorkspaces)
        {
            // Note: There should not be any duplicate Addresses
            // TODO: Create a unique-key index on DbWorkspace.Address; should be a composite key (DatacenterId, Address)
            if (workspaceEntries.TryGetValue(dbWorkspace.Address, out var workspaceEntry))
            {
                // Duplicate Workspace Address found; throw an exception
                throw new InvalidOperationException($"Duplicate Workspace Address '{dbWorkspace.Address}' found for Workspaces '{workspaceEntry.Name}' and '{dbWorkspace.Name}' for Site '{dbWorkspace.Site?.Name}'.");
            }
            
            workspaceEntry = new WorkspaceEntry
            {
                Address = dbWorkspace.Address,
                Name = dbWorkspace.Name,
                Locked = dbWorkspace.Locked,
                DbWorkspace = dbWorkspace,
                VirtualNetworks = dbWorkspace.VirtualNetworks
                    .Select(vn => new VirtualNetworkEntry
                    {
                        DbVirtualNetwork = vn,
                        Name = vn.Name,
                        Tag = vn.Tag,
                        Index = vn.Index,
                        PVEResource = null
                    })
                    .ToList()
            };
            
            workspaceEntries[dbWorkspace.Address] = workspaceEntry;
        }

        // Second pass, parse the PVE resources and populate the workspace entries
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

            if (workspaceAddress == null) continue; // Skip invalid named resources

            if (!workspaceEntries.TryGetValue(workspaceAddress.Value, out var workspaceEntry))
            {
                if (!discoverFromPveResource)
                {
                    // If the workspace entry does not exist already (from dbWorkspace) and we are not creating it from PVE resource, skip this resource
                    continue;
                }

                if (workspaceAddress.Value == 0)
                    continue;   // Ignore the host workspace

                // If the workspace entry does not exist, create a new one
                workspaceEntry = new WorkspaceEntry
                {
                    Address = workspaceAddress.Value,
                    Name = string.Empty, // Name will be set later based on the resource type
                    Locked = false,
                };
                workspaceEntries[workspaceAddress.Value] = workspaceEntry;
            }
            // Populate the workspace entry based on the resource type
            switch (resourceType)
            {
                case MDCHelper.MDCResourceType.VirtualMachine:
                    workspaceEntry.VirtualMachines.Add(new VirtualMachineEntry
                    {
                        PVEResource = resource,
                        Index = resourceIndex,
                        Name = resourceName
                    });
                    break;
                case MDCHelper.MDCResourceType.Gateway:
                    {
                        // Find the existing Virtual Network entry, or add a new one
                        var virtualNetworkEntry = workspaceEntry.VirtualNetworks.FirstOrDefault(vn => vn.Name == resourceName);

                        if (virtualNetworkEntry == null)
                        {
                            // throw new InvalidOperationException($"Virtual Network '{resourceName}' not found in Workspace '{workspaceEntry.Name}' for Gateway resource '{resource.Name}'.");
                            workspaceEntry.VirtualNetworks.Add(new VirtualNetworkEntry
                            {
                                DbVirtualNetwork = null,
                                Tag = null,
                                PVEResource = resource,
                                Index = resourceIndex,
                                Name = resourceName
                            });
                            break;
                        }

                        // The Virtual Network Name and Index are already set from the DB; If they do not match, throw an exception
                        if (virtualNetworkEntry.Index != resourceIndex)
                        {
                            throw new InvalidOperationException($"Virtual Network '{resourceName}' index mismatch in Workspace '{workspaceEntry.Name}' for Gateway resource '{resource.Name}'. Expected index '{virtualNetworkEntry.Index}', found '{resourceIndex}'.");
                        }

                        virtualNetworkEntry.PVEResource = resource;
                        break;
                    }
            }

        }

        // Third pass, create the WorkspaceDescriptor for each workspace entry
        foreach (var workspaceEntry in workspaceEntries.Values)
        {
            if (workspaceEntry.WorkspaceDescriptor != null) continue; // Already created

            // if (workspaceEntry.DbWorkspace == null) throw new NotImplementedException("Workspace Entry without DbWorkspace");

            workspaceEntry.WorkspaceDescriptor = new WorkspaceDescriptor
            {
                Name = workspaceEntry.Name,
                Description = workspaceEntry.DbWorkspace?.Description,
                VirtualNetworks = workspaceEntry.VirtualNetworks
                    .Select(vn =>
                    {
                        string? templateName = null;
                        int? templateRevision = null;
                        var hasGatewayTemplate = vn.PVEResource != null && MDCHelper.GetMDCTemplateForResource(vn.PVEResource, pveResources, out var templateResource, out templateName, out templateRevision);
                        return new VirtualNetworkDescriptor
                        {
                            Name = vn.Name ?? string.Empty,
                            Gateway = !hasGatewayTemplate ? null : new VirtualNetworkGatewayDescriptor
                            {
                                TemplateName = templateName!,
                                TemplateRevision = templateRevision
                            },
                            EnableRemoteNetwork = vn.DbVirtualNetwork?.ZeroTierNetworkId != null
                        };
                    })
                    .ToArray(),
                VirtualMachines = workspaceEntry.VirtualMachines
                    .Select(vm =>
                    {
                        string? templateName = null;
                        int? templateRevision = null;

                        // What template is used for this VM?  What happens if no template is found?
                        if (vm.PVEResource == null || !MDCHelper.GetMDCTemplateForResource(vm.PVEResource, pveResources, out var templateResource, out templateName, out templateRevision))
                        // throw new InvalidOperationException($"Virtual Machine '{vm.Name}' is missing required tag 'template_vmid' to identify its template.");
                        {
                            // Do nothing for now
                        }

                        return vm.VirtualMachineDescriptor = new VirtualMachineDescriptor
                        {
                            Name = vm.Name ?? string.Empty,
                            TemplateName = templateName,
                            TemplateRevision = templateRevision,
                            CPUCores = vm.PVEQemuConfig?.Cores,
                            MemoryMB = vm.PVEQemuConfig?.Memory == null ? null : int.Parse(vm.PVEQemuConfig.Memory),
                            NetworkAdapters = vm.PVEQemuConfig?.ParseNetworkAdapters().Select(networkAdapter => new VirtualMachineNetworkAdapterDescriptor
                            {
                                IsDisconnected = networkAdapter.IsDisconnected,
                                Name = networkAdapter.DeviceId,
                                RefVirtualNetworkName = workspaceEntry.VirtualNetworks.FirstOrDefault(vnet => vnet.Tag == networkAdapter.Tag)?.Name
                            }).ToArray()

                        };
                    })
                    .ToArray()
            };
        }

        return (workspaceEntries.Values.ToArray(), templateEntries.ToArray());
    }

    public static Dictionary<string, string?> GetTags(this PVEResource resource)
    {
        return (resource.Tags ?? string.Empty)
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('.', 2, StringSplitOptions.RemoveEmptyEntries))
            .ToDictionary(parts => parts[0].Trim(), parts => parts.ElementAtOrDefault(1)?.Trim());
    }

    // Extend IEnumerable<PVEClusterStatus> to add a LocalNode property
    public static PVEClusterStatus GetLocalNode(this IEnumerable<PVEClusterStatus> clusterStatus)
    {
        return clusterStatus.FirstOrDefault(i => i.Local == 1) ?? throw new InvalidOperationException("Local node not found in cluster status.");
    }

    public static PVEClusterStatus[] GetHostNodes(this IEnumerable<PVEClusterStatus> clusterStatus)
    {
        return clusterStatus.Where(i => i.Type == PVEClusterStatusType.Node).ToArray();
    }

    public static PVEClusterStatus GetClusterNode(this IEnumerable<PVEClusterStatus> clusterStatus)
    {
        // This method should return the datacenter name from the cluster status.
        if (clusterStatus.Count() == 1)
        {
            // Single Node Cluster
            var node = clusterStatus.Single();
            if (node.Type != PVEClusterStatusType.Node)
            {
                throw new InvalidOperationException("Expected a single node cluster with type 'node'.");
            }
            return node;
        }
        else
        {
            // Multi Node Cluster
            var cluster = clusterStatus.FirstOrDefault(x => x.Type == PVEClusterStatusType.Cluster);
            if (cluster == null)
            {
                throw new InvalidOperationException("Expected a cluster type in multi node cluster status.");
            }
            return cluster;
        }
    }

    public static PVEClusterStatus GetClusterNode(this IEnumerable<PVEClusterStatus> clusterStatus, string siteName)
    {
        var clusterNode = clusterStatus.GetClusterNode();
        if (clusterNode.Name != siteName)
        {
            throw new InvalidOperationException($"Cluster node name '{clusterNode.Name}' does not match expected site name '{siteName}'.");
        }
        return clusterNode;
    }


    //extension(PVEClusterStatus)
    //{
    //           public bool LocalNode => this.NodeName == PVEClientService.LocalNodeName;
    //}

    //public static PVEClusterStatus? GetLocalNode(this IEnumerable<PVEClusterStatus> clusterStatus)
    //{
    //    return clusterStatus.FirstOrDefault(i => i.LocalNode);
    //}




    //static extension PVEClusterExtensions for IEnumerable<PVEClusterStatus>
    //{

    //}
    //public static string PVEClusterStatus ParsePVEResources(this IEnumerable<PVEClusterStatus> clusterStatus)
    //{

    //}
}
