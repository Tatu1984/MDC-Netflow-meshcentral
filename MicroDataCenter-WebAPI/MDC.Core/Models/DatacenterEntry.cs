using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;
using System.Net;

namespace MDC.Core.Models;

internal class DatacenterEntryBase
{
    public required IPVEClientService PVEClient { get; set; }

    public required string ClusterName { get; set; }
}

internal class DatacenterEntry : DatacenterEntryBase
{
    public required DatacenterSettings DatacenterSettings { get; set; }

    public required DbSite DbSite { get; set; }

    public required string Description { get; set; }

    public required NodeEntry[] Nodes { get; set; }

    public required PVEResource[] Storage { get; set; }

    public required WorkspaceEntry[] Workspaces { get; set; }

    public required VirtualMachineTemplateEntry[] GatewayTemplates { get; set; }

    public required VirtualMachineTemplateEntry[] VirtualMachineTemplates { get; set; }

    private void NormalizeVirtualNetworks(WorkspaceDescriptor workspaceDescriptor, WorkspaceEntry? existingWorkspaceEntry = null)
    {
        // Ensure that there is at least one VirtualNetwork described
        if (workspaceDescriptor.VirtualNetworks == null || workspaceDescriptor.VirtualNetworks.Length == 0)
        {
            workspaceDescriptor.VirtualNetworks = [new VirtualNetworkDescriptor { Name = DatacenterSettings.DefaultPrimaryVirtualNetworkName }];
        }

        // Ensure that when there is exactly one VirtualNetwork, it has a gateway
        if (workspaceDescriptor.VirtualNetworks.Length == 1)
        {
            workspaceDescriptor.VirtualNetworks[0].Name ??= DatacenterSettings.DefaultPrimaryVirtualNetworkName;
            var primaryVirtualNetworkGatewayDescriptor = workspaceDescriptor.VirtualNetworks[0].Gateway ??= new();
            primaryVirtualNetworkGatewayDescriptor.Operation ??= (existingWorkspaceEntry == null) ? VirtualMachineDescriptorOperation.Add : VirtualMachineDescriptorOperation.Update;
        }

        foreach (var virtualNetwork in workspaceDescriptor.VirtualNetworks)
        {
            // When creating a new Workspace, ensure that the operation for all VirtualNetworks is 'add'
            virtualNetwork.Operation ??= (existingWorkspaceEntry?.VirtualNetworks.FirstOrDefault(i => i.Name == virtualNetwork.Name) == null) ? VirtualNetworkDescriptorOperation.Add : VirtualNetworkDescriptorOperation.Update;
            
            if (existingWorkspaceEntry == null && virtualNetwork.Operation != VirtualNetworkDescriptorOperation.Add)
                throw new InvalidOperationException("Cannot modify Virtual Network because the existing Workspace entry is not provided. Use 'add' operation instead.");


            //else if (existingWorkspaceEntry != null && virtualNetwork.Operation == VirtualNetworkDescriptorOperation.Add)
            //    throw new InvalidOperationException("Cannot add Virtual Network because the existing Workspace entry is provided. Use 'update' or 'remove' operation instead.");
        }

        // Normalize the Virtual Networks and their Gateways
        bool hasEgressGateway = workspaceDescriptor.VirtualNetworks.Any(i => i.Gateway != null && i.Gateway.WANNetworkType == VirtualNetworkGatewayWANNetworkType.Egress);
        for (var index = 0; index < workspaceDescriptor.VirtualNetworks.Length; index++)
        {
            var virtualNetwork = workspaceDescriptor.VirtualNetworks[index];

            // Virtual Network must have a Name
            virtualNetwork.Name ??= $"vnet{index}";

            // If Virtual Network has a Gateway then the TemplateName and WANNetworkType must be set
            if (virtualNetwork.Gateway != null)
            {
                virtualNetwork.Gateway.TemplateName ??= DatacenterSettings.DefaultGatewayTemplateName;
                virtualNetwork.Gateway.TemplateRevision ??= DatacenterSettings.DefaultGatewayTemplateRevision;
                virtualNetwork.Gateway.WANNetworkType ??= (hasEgressGateway ? VirtualNetworkGatewayWANNetworkType.Internal : VirtualNetworkGatewayWANNetworkType.Egress);   // First Gateway is Egress, others are Internal by default
                if (virtualNetwork.Gateway.WANNetworkType == VirtualNetworkGatewayWANNetworkType.Egress)
                    hasEgressGateway = true;
                virtualNetwork.Gateway.Operation ??= virtualNetwork.Operation == VirtualNetworkDescriptorOperation.Add ? VirtualMachineDescriptorOperation.Add : VirtualMachineDescriptorOperation.None;    // If the Virtual Network is being added, then the Gateway must be added too 
            }

            // Validate the RemoteNetwork references are valid
            if (virtualNetwork.EnableRemoteNetwork == true)
            {
                // Must have a Gateway when EnableRemoteNetwork is true
                if (virtualNetwork.Gateway == null) throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' must have a Gateway when EnableRemoteNetwork is true.");
                // NOTE: When the Gateway does not have a route to the internet, such as when the WAN network is disconnected or internal only going thru and air-gapped network, then VMs will never be able to reach the remote network

                IPNetwork? ipNetwork = null;
                // RemoteNetworkAddressCIDR must be a valid IP Network when specified
                if (!string.IsNullOrEmpty(virtualNetwork.RemoteNetworkAddressCIDR))
                {
                    if (!IPNetwork.TryParse(virtualNetwork.RemoteNetworkAddressCIDR, out var _ipNetwork))
                        throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has an invalid RemoteNetworkAddressCIDR '{virtualNetwork.RemoteNetworkAddressCIDR}'.");
                    ipNetwork = _ipNetwork;
                }

                // RemoteNetworkIPRangeStart is an IP address that is within the RemoteNetworkAddressCIDR when specified
                if (!string.IsNullOrEmpty(virtualNetwork.RemoteNetworkIPRangeStart))
                {
                    if (!IPAddress.TryParse(virtualNetwork.RemoteNetworkIPRangeStart, out var ipAddress))
                        throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has an invalid RemoteNetworkIPRangeStart '{virtualNetwork.RemoteNetworkIPRangeStart}'.");
                    if (ipNetwork == null)
                        throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has RemoteNetworkIPRangeStart specified, but RemoteNetworkAddressCIDR is not specified.");
                    if (!ipNetwork.Value.Contains(ipAddress))
                        throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has RemoteNetworkIPRangeStart '{virtualNetwork.RemoteNetworkIPRangeStart}' that is not within the RemoteNetworkAddressCIDR '{virtualNetwork.RemoteNetworkAddressCIDR}'.");
                }

                // RemoteNetworkIPRangeEnd is an IP address that is within the RemoteNetworkAddressCIDR when specified
                if (!string.IsNullOrEmpty(virtualNetwork.RemoteNetworkIPRangeEnd))
                {
                    if (!IPAddress.TryParse(virtualNetwork.RemoteNetworkIPRangeEnd, out var ipAddress))
                        throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has an invalid RemoteNetworkIPRangeEnd '{virtualNetwork.RemoteNetworkIPRangeEnd}'.");
                    if (ipNetwork == null)
                        throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has RemoteNetworkIPRangeEnd specified, but RemoteNetworkAddressCIDR is not specified.");
                    if (!ipNetwork.Value.Contains(ipAddress))
                        throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has RemoteNetworkIPRangeEnd '{virtualNetwork.RemoteNetworkIPRangeEnd}' that is not within the RemoteNetworkAddressCIDR '{virtualNetwork.RemoteNetworkAddressCIDR}'.");
                }
            }
            else
            {
                // Validate the RemoteNetwork references are not set when EnableRemoteNetwork is not true
                if (virtualNetwork.RemoteNetworkAddressCIDR != null) throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has RemoteNetworkAddressCIDR specified, but EnableRemoteNetwork is not set to true.");
                if (virtualNetwork.RemoteNetworkIPRangeStart != null) throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has RemoteNetworkIPRangeStart specified, but EnableRemoteNetwork is not set to true.");
                if (virtualNetwork.RemoteNetworkIPRangeEnd != null) throw new InvalidOperationException($"Virtual Network '{virtualNetwork.Name}' has RemoteNetworkIPRangeEnd specified, but EnableRemoteNetwork is not set to true.");
            }
        }

        // Validate the VirtualNetwork Gateways
        {
            // All Virtual Networks must have a unique name
            var duplicateVirtualNetworkNames = workspaceDescriptor.VirtualNetworks.GroupBy(i => i.Name).Where(g => g.Count() > 1).Select(g => g.Key).ToArray();
            if (duplicateVirtualNetworkNames.Length > 0)
                throw new InvalidOperationException($"Workspace definition contains duplicate Virtual Network names: '{string.Join("', '", duplicateVirtualNetworkNames)}'");

            // Validate there must be at least one VirtualNetwork having a Gateway and WANNetworkType == Egress
            if (!workspaceDescriptor.VirtualNetworks.Any(i => i.Gateway?.WANNetworkType == VirtualNetworkGatewayWANNetworkType.Egress))
                throw new InvalidOperationException($"Workspace definition must contain at least one Virtual Network having a Gateway with WANNetworkType == Egress");

            // Validate the Gateway WANNetworkType references
            foreach (var virtualNetwork in workspaceDescriptor.VirtualNetworks)
            {
                if (virtualNetwork.Gateway == null) continue;

                switch (virtualNetwork.Gateway.WANNetworkType)
                {
                    case VirtualNetworkGatewayWANNetworkType.Egress: break;
                    case VirtualNetworkGatewayWANNetworkType.Internal:
                        {
                            if (!workspaceDescriptor.VirtualNetworks.Any(i => i.Name == virtualNetwork.Gateway.RefInternalWANVirtualNetworkName)) throw new InvalidOperationException($"Virtual Network Name '{virtualNetwork.Gateway.RefInternalWANVirtualNetworkName}' does not existing in Workspace definition");
                            break;
                        }
                    case VirtualNetworkGatewayWANNetworkType.Public:
                        {
                            if (string.IsNullOrEmpty(DatacenterSettings.PublicBridgeName))
                                throw new NotSupportedException($"Virtual Network Name '{virtualNetwork.Gateway.RefInternalWANVirtualNetworkName}' WANNetworkType: 'Public' is not supported by this Datacenter");
                            break;
                        }
                    default:
                        throw new InvalidOperationException($"Unknown Gateway WAN Type '{virtualNetwork.Gateway.WANNetworkType}'");
                }

                if (virtualNetwork.Operation == VirtualNetworkDescriptorOperation.Add && virtualNetwork.Gateway.Operation != VirtualMachineDescriptorOperation.Add)
                    throw new InvalidOperationException("When adding a new Virtual Network with a Gateway, the Gateway operation must be 'add'.");
            }

            // Validate that all remote networks have unique RemoteNetworkAddressCIDR
            var remoteNetworkCIDRs = workspaceDescriptor.VirtualNetworks.Where(i => i.EnableRemoteNetwork == true).Select(i => i.RemoteNetworkAddressCIDR).Where(i => i != null).ToArray();
            var duplicateRemoteNetworkCIDRs = remoteNetworkCIDRs.GroupBy(i => i).Where(g => g.Count() > 1).Select(g => g.Key).ToArray();
            if (duplicateRemoteNetworkCIDRs.Length > 0)
                throw new InvalidOperationException($"Workspace definition contains duplicate Remote Network CIDR definitions: '{string.Join("', '", duplicateRemoteNetworkCIDRs)}'");
        }
    }

    private void NormalizeVirtualMachines(WorkspaceDescriptor workspaceDescriptor, WorkspaceEntry? existingWorkspaceEntry = null)
    {
        if (workspaceDescriptor.VirtualNetworks == null)
            throw new ArgumentNullException(nameof(workspaceDescriptor.VirtualNetworks), "Virtual Networks must be normalized before Virtual Machines");

        workspaceDescriptor.VirtualMachines ??= [];

        for (var index = 0; index < workspaceDescriptor.VirtualMachines.Length; index++)
        {
            var virtualMachineDescriptor = workspaceDescriptor.VirtualMachines![index];
            virtualMachineDescriptor.Name ??= $"VirtualMachine{index:D2}";

            // Virtual Machine must have at least Network Adapter
            virtualMachineDescriptor.NetworkAdapters ??= [new VirtualMachineNetworkAdapterDescriptor
                {
                    IsFirewallEnabled = true,
                    IsDisconnected = false
                }];

            int firstUnusedId = 0;
            var defaultVirtualNetwork = workspaceDescriptor.VirtualNetworks.First(i => i.Gateway != null && i.Gateway.WANNetworkType == VirtualNetworkGatewayWANNetworkType.Egress);
            var validVirtualNetworkNames = workspaceDescriptor.VirtualNetworks.Select(i => i.Name).Distinct();
            foreach (var networkAdapter in virtualMachineDescriptor.NetworkAdapters)
            {
                // Ensure Network Adapter has a name
                if (string.IsNullOrEmpty(networkAdapter.Name))
                {
                    while (true)
                    {
                        var name = $"net{firstUnusedId++}";
                        if (!virtualMachineDescriptor.NetworkAdapters.Any(i => i.Name == name))
                        {
                            // name is available
                            networkAdapter.Name = name;
                            break;
                        }
                        if (firstUnusedId > 99)
                            throw new InvalidOperationException("Virtual Machines must have less than 100 Network Adapters");
                    }
                }

                // Ensure that reference Virtual Network is valid
                networkAdapter.RefVirtualNetworkName ??= defaultVirtualNetwork.Name;
                var virtualNetwork = workspaceDescriptor.VirtualNetworks.FirstOrDefault(i => i.Name == networkAdapter.RefVirtualNetworkName);
                if (virtualNetwork == null)
                    throw new InvalidOperationException($"VirtualMachine NetworkAdapter RefVirtualNetworkName '{networkAdapter.RefVirtualNetworkName}' is invalid. Does not reference a Workspace VirtualNetwork");

                // Validate the RemoteNetwork references are valid
                if (networkAdapter.EnableRemoteNetwork == true)
                {
                    if (virtualNetwork.EnableRemoteNetwork != true)
                        throw new InvalidOperationException($"Virtual Network for VirtualMachine NetworkAdapter RefVirtualNetworkName '{networkAdapter.RefVirtualNetworkName}' must have EnableRemoteNetwork = true when NetworkAdapter EnableRemoteNetwork = true");
                    
                    if (!string.IsNullOrEmpty(virtualNetwork.RemoteNetworkAddressCIDR) && !string.IsNullOrEmpty(networkAdapter.RemoteNetworkIPAddress))
                    {
                        if (!IPAddress.TryParse(networkAdapter.RemoteNetworkIPAddress, out var ipAddress))
                            throw new InvalidOperationException($"VirtualMachine NetworkAdapter RefVirtualNetworkName '{networkAdapter.RefVirtualNetworkName}' has an invalid RemoteNetworkIPAddress '{networkAdapter.RemoteNetworkIPAddress}'.");

                        if (!IPNetwork.TryParse(virtualNetwork.RemoteNetworkAddressCIDR, out var ipNetwork))
                            throw new InvalidOperationException($"VirtualMachine NetworkAdapter RefVirtualNetworkName '{networkAdapter.RefVirtualNetworkName}' has an invalid RemoteNetworkAddressCIDR '{virtualNetwork.RemoteNetworkAddressCIDR}'.");  // Should not happen because Virtual Networks are normalized first

                        if (!ipNetwork.Contains(ipAddress))
                            throw new InvalidOperationException($"VirtualMachine NetworkAdapter RefVirtualNetworkName '{networkAdapter.RefVirtualNetworkName}' has RemoteNetworkIPAddress '{networkAdapter.RemoteNetworkIPAddress}' that is not within the RemoteNetworkAddressCIDR '{virtualNetwork.RemoteNetworkAddressCIDR}'.");
                    }
                }
                else
                {
                    if (networkAdapter.RemoteNetworkIPAddress != null)
                        throw new InvalidOperationException($"VirtualMachine NetworkAdapter RefVirtualNetworkName '{networkAdapter.RefVirtualNetworkName}' has RemoteNetworkIPAddress specified, but EnableRemoteNetwork is not set to true.");
                }
            }
        }

        // All Virtual Machines must have a unique name
        var duplicateVirtualMachineNames = workspaceDescriptor.VirtualMachines.GroupBy(i => i.Name).Where(g => g.Count() > 1).Select(g => g.Key).ToArray();
        if (duplicateVirtualMachineNames.Length > 0)
            throw new InvalidOperationException($"Workspace definition contains duplicate Virtual Machine names: '{string.Join("', '", duplicateVirtualMachineNames)}'");

        // All Virtual Machines must have an operation
        foreach (var virtualMachine in workspaceDescriptor.VirtualMachines)
        {
            var existingVirtualMachine = existingWorkspaceEntry?.VirtualMachines.FirstOrDefault(i => i.Name == virtualMachine.Name);
            
            // When creating a new Workspace, ensure that the operation for all VirtualMachines is 'add'
            virtualMachine.Operation ??= (existingVirtualMachine == null) ? VirtualMachineDescriptorOperation.Add : VirtualMachineDescriptorOperation.None;

            if (existingVirtualMachine == null && virtualMachine.Operation != VirtualMachineDescriptorOperation.Add)
                throw new InvalidOperationException("Cannot modify Virtual Machine because the existing Workspace entry is not provided. Use 'add' operation instead.");
            else if (existingVirtualMachine != null && virtualMachine.Operation == VirtualMachineDescriptorOperation.Add)
                throw new InvalidOperationException("Cannot add Virtual Machine because the existing Workspace entry is provided. Use 'update' or 'remove' operation instead.");

            // When adding a Virtual Machine, the template name must be specified
            if (virtualMachine.Operation == VirtualMachineDescriptorOperation.Add)
            {
                if (virtualMachine.TemplateName == null)
                    throw new InvalidOperationException($"Cannot add Virtual Machine '{virtualMachine.Name}' because the required 'templateName' property does not have a value.");
            }

            // Override Operation of None with Update if needed
            if (virtualMachine.Operation == VirtualMachineDescriptorOperation.None)
            {
                if (virtualMachine.CPUCores != existingVirtualMachine?.VirtualMachineDescriptor?.CPUCores)
                    virtualMachine.Operation = VirtualMachineDescriptorOperation.Update;

                if (virtualMachine.MemoryMB != existingVirtualMachine?.VirtualMachineDescriptor?.MemoryMB)
                    virtualMachine.Operation = VirtualMachineDescriptorOperation.Update;

                foreach (var virtualMachineNetworkAdapter in virtualMachine.NetworkAdapters ?? [])
                {
                    var existingNetworkAdapter = existingVirtualMachine?.VirtualMachineDescriptor?.NetworkAdapters?.SingleOrDefault(na => virtualMachineNetworkAdapter.Name == null || na.Name == virtualMachineNetworkAdapter.Name);
                    if (existingNetworkAdapter == null)
                    { 
                        virtualMachineNetworkAdapter.Operation = VirtualNetworkDescriptorOperation.Update;
                        break;
                    }

                    if (virtualMachineNetworkAdapter.EnableRemoteNetwork != existingNetworkAdapter.EnableRemoteNetwork)
                        virtualMachineNetworkAdapter.Operation = VirtualNetworkDescriptorOperation.Update;

                    if (virtualMachineNetworkAdapter.IsDisconnected != existingNetworkAdapter.IsDisconnected)
                        virtualMachineNetworkAdapter.Operation = VirtualNetworkDescriptorOperation.Update;
                }

                if ((virtualMachine.NetworkAdapters ?? []).Any(na => na.Operation == VirtualNetworkDescriptorOperation.Update))
                    virtualMachine.Operation = VirtualMachineDescriptorOperation.Update;
            }
        }
    }

    private void Normalize(WorkspaceDescriptor workspaceDescriptor, WorkspaceEntry? existingWorkspaceEntry)
    {
        // Set defaults for VirtualNetworks
        NormalizeVirtualNetworks(workspaceDescriptor, existingWorkspaceEntry);

        // Set defaults for VirtualMachines
        NormalizeVirtualMachines(workspaceDescriptor, existingWorkspaceEntry);
    }

    private class ResourceAllocation
    {
        public Dictionary<string, long> TotalMemoryAssigned = new Dictionary<string, long>();
        public long TotalStorageAssigned = 0;
    }

    public WorkspaceOperation[] ComputeWorkspaceOperations(WorkspaceDescriptor workspaceDescriptor, WorkspaceEntry? existingWorkspaceEntry)
    {
        // Normalize the values of the workspace descriptor against existing data, if any
        Normalize(workspaceDescriptor, existingWorkspaceEntry);

        // Prepare the initial state
        // Note: Assume there is one storage pool for images (hyperconverged for all nodes);  Is there enough space, with 20% remaining?
        var imageStorage = Storage.FirstOrDefault(i => (i.Content ?? string.Empty).Split(',').Contains("images")) ?? throw new InvalidOperationException($"Unable to determine storage capacity for Datacenter");

        ResourceAllocation resourceAllocation = new ResourceAllocation();
        foreach (var node in Nodes.Select(i => i.PVEResource.Node!).Distinct())
        {
            resourceAllocation.TotalMemoryAssigned.Add(node, 0);
        }

        List<WorkspaceOperation> operations = new List<WorkspaceOperation>();

        // Compute the Gateway assignments
        operations.AddRange(ComputeVirtualNetworkOperations(workspaceDescriptor, existingWorkspaceEntry, resourceAllocation));

        // Compute the Virtual Machine assignments
        operations.AddRange(ComputeVirtualMachineOperations(workspaceDescriptor, existingWorkspaceEntry, resourceAllocation));

        // Check the total storage required
        if (imageStorage.MaxDisk * 0.80d < (imageStorage.Disk + resourceAllocation.TotalStorageAssigned)) throw new InvalidOperationException($"Insufficient Datacenter storage capacity for allocating Virtual Machines.  Requested: {(imageStorage.Disk + resourceAllocation.TotalStorageAssigned)}.  Available: {imageStorage.MaxDisk * 0.80d}");

        return operations.ToArray();
    }

    private WorkspaceOperation[] ComputeVirtualNetworkOperations(WorkspaceDescriptor workspaceDescriptor, WorkspaceEntry? existingWorkspaceEntry, ResourceAllocation resourceAllocation)
    {
        List<WorkspaceOperation> operations = new List<WorkspaceOperation>();

        for (int index = 0; index < (workspaceDescriptor.VirtualNetworks ?? []).Length; index++)
        {
            var virtualNetworkDescriptor = workspaceDescriptor.VirtualNetworks![index];

            // Should Remote Network be created/removed?
            switch (virtualNetworkDescriptor.Operation)
            {
                case VirtualNetworkDescriptorOperation.Add:
                    {
                        if (virtualNetworkDescriptor.EnableRemoteNetwork == true)
                        {
                            operations.Add(new AddRemoteNetworkOperation
                            {
                                VirtualNetworkDescriptor = virtualNetworkDescriptor
                            });
                        }
                        break;
                    }
                case VirtualNetworkDescriptorOperation.Update:
                    {
                        var zeroTierNetworkId = existingWorkspaceEntry?.VirtualNetworks?.FirstOrDefault(i => i.Name == virtualNetworkDescriptor.Name)?.DbVirtualNetwork?.ZeroTierNetworkId;

                        if (virtualNetworkDescriptor.EnableRemoteNetwork == true && zeroTierNetworkId == null)
                        {
                            // Remote Network needs to be created
                            operations.Add(new AddRemoteNetworkOperation
                            {
                                VirtualNetworkDescriptor = virtualNetworkDescriptor
                            });
                        }
                        else if (virtualNetworkDescriptor.EnableRemoteNetwork != true && zeroTierNetworkId != null)
                        {
                            // Remote Network needs to be removed
                            operations.Add(new RemoveRemoteNetworkOperation
                            {
                                VirtualNetworkDescriptor = virtualNetworkDescriptor,
                                ZeroTierNetworkId = zeroTierNetworkId
                            });
                        }
                        else if (virtualNetworkDescriptor.EnableRemoteNetwork == true && zeroTierNetworkId != null)
                        {
                            // Remote Network needs to be updated
                            operations.Add(new UpdateRemoteNetworkOperation
                            {
                                VirtualNetworkDescriptor = virtualNetworkDescriptor,
                                ZeroTierNetworkId = zeroTierNetworkId
                            });
                        }
                        
                        break;
                    }
                case VirtualNetworkDescriptorOperation.Remove:
                    {
                        var zeroTierNetworkId = existingWorkspaceEntry?.VirtualNetworks?.FirstOrDefault(i => i.Name == virtualNetworkDescriptor.Name)?.DbVirtualNetwork?.ZeroTierNetworkId;
                        if (zeroTierNetworkId != null)
                        {
                            operations.Add(new RemoveRemoteNetworkOperation
                            {
                                VirtualNetworkDescriptor = virtualNetworkDescriptor,
                                ZeroTierNetworkId = zeroTierNetworkId
                            });
                        }
                        break;
                    }
                case VirtualNetworkDescriptorOperation.None:
                    {
                        break;  // Do nothing
                    }
                default:
                    {
                        throw new NotImplementedException($"Virtual Network Operation '{virtualNetworkDescriptor.Operation}'");
                    }
            }

            if (virtualNetworkDescriptor.Gateway == null || virtualNetworkDescriptor.Gateway.TemplateName == null) continue;

            switch (virtualNetworkDescriptor.Gateway.Operation)
            {
                case VirtualMachineDescriptorOperation.Add:
                    {
                        var gatewayTemplate = GatewayTemplates.Where(i => i.Name == virtualNetworkDescriptor.Gateway.TemplateName).OrderByDescending(i => i.Index).FirstOrDefault(i => virtualNetworkDescriptor.Gateway.TemplateRevision == null || virtualNetworkDescriptor.Gateway.TemplateRevision == i.Index)
                            ?? throw new InvalidOperationException($"Gateway Template '{virtualNetworkDescriptor.Gateway.TemplateRevision}' {(virtualNetworkDescriptor.Gateway.TemplateRevision == null ? string.Empty : "Revision " + virtualNetworkDescriptor.Gateway.TemplateRevision)} not found.");

                        var gatewayStorageSize = gatewayTemplate.Storage?.Sum(i => i.GetSize() ?? 0) ?? throw new InvalidOperationException($"Unable to determine storage requirements for Gateway VM Template '{gatewayTemplate.Name}'.");
                        var gatewayMemorySize = gatewayTemplate.PVEResource?.MaxMem ?? throw new InvalidOperationException($"Unable to determine memory requirements for Gateway VM Template '{gatewayTemplate.Name}'.");

                        // Find target node to run gateway, having the most memory used, but 20% remaining
                        var gatewayNode = Nodes.Select(node => new
                        {
                            Node = node,
                            MemRemaining = ((node.PVEResource.MaxMem ?? 0) * 0.80d) - (node.PVEResource.Mem ?? 0) - gatewayMemorySize - resourceAllocation.TotalMemoryAssigned[node.PVEResource.Node!]
                        })
                        .Where(i => i.MemRemaining > 0)
                        .OrderBy(i => i.MemRemaining)
                        .FirstOrDefault()
                        ?? throw new InvalidOperationException($"Insufficient memory on any Datacenter node for Gateway VM Template '{gatewayTemplate.Name}' ({gatewayMemorySize} bytes required)");

                        resourceAllocation.TotalMemoryAssigned[gatewayNode.Node.PVEResource.Node!] += gatewayMemorySize;
                        resourceAllocation.TotalStorageAssigned += gatewayStorageSize;

                        operations.Add(new CloneGatewayVirtualMachineOperation
                        {
                            TemplateEntry = gatewayTemplate,
                            TargetNode = gatewayNode.Node.PVEResource.Node!,
                            Index = index,
                            VirtualNetworkDescriptors = [virtualNetworkDescriptor]
                        });
                        break;
                    }
                case VirtualMachineDescriptorOperation.None: break; // Do nothing
                case VirtualMachineDescriptorOperation.Update:
                    {
                        // Nothing to do here.  Skip update
                        break;
                    }
                default:
                    {
                        throw new NotImplementedException($"Virtual Network Gateway Operation '{virtualNetworkDescriptor.Gateway.Operation}'");
                    }
            }
        }

        return operations.ToArray();
    }

    private WorkspaceOperation[] ComputeVirtualMachineOperations(WorkspaceDescriptor workspaceDescriptor, WorkspaceEntry? existingWorkspaceEntry, ResourceAllocation resourceAllocation)
    {
        List<WorkspaceOperation> operations = new List<WorkspaceOperation>();

        for (int index = 0; index < (workspaceDescriptor.VirtualMachines ?? []).Length; index++)
        {
            var virtualMachineDescriptor = workspaceDescriptor.VirtualMachines![index];

            if (virtualMachineDescriptor.Operation == null)
                throw new InvalidOperationException("Virtual Machine Operation must be specified");

            switch (virtualMachineDescriptor.Operation)
            {
                case VirtualMachineDescriptorOperation.Add:
                    {
                        var virtualMachineTemplate = VirtualMachineTemplates
                            .Where(i => i.Name == virtualMachineDescriptor.TemplateName)
                            .OrderByDescending(i => i.Index)
                            .FirstOrDefault(i => virtualMachineDescriptor.TemplateRevision == null || virtualMachineDescriptor.TemplateRevision == i.Index)
                            ?? throw new InvalidOperationException($"VirtualMachine Template '{virtualMachineDescriptor.TemplateName}' {(virtualMachineDescriptor.TemplateRevision == null ? string.Empty : "Revision " + virtualMachineDescriptor.TemplateRevision)} not found.");

                        var vmStorageSize = virtualMachineTemplate.Storage?.Sum(i => i.GetSize() ?? 0) ?? throw new InvalidOperationException($"Unable to determine storage requirements for VM Template '{virtualMachineTemplate.Name}'.");
                        var vmMemorySize = virtualMachineTemplate.PVEResource?.MaxMem ?? throw new InvalidOperationException($"Unable to determine memory requirements for VM Template '{virtualMachineTemplate.Name}'.");

                        if (virtualMachineDescriptor.MemoryMB != null)
                        {
                            //var requestedMemorySize = long.Parse(virtualMachineDescriptor.MemoryMB) * 1024L * 1024L;
                            //if (requestedMemorySize > vmMemorySize)
                            {
                                vmMemorySize = virtualMachineDescriptor.MemoryMB.Value * 1024L;
                            }
                        }

                        // Find target node to run VM, having the most memory used (including gateway(s)), but 20% remaining
                        var vmNode = Nodes.Select(node => new
                        {
                            Node = node,
                            MemRemaining = ((node.PVEResource.MaxMem ?? 0) * 0.80d) - (node.PVEResource.Mem ?? 0) - vmMemorySize - resourceAllocation.TotalMemoryAssigned[node.PVEResource.Node!]
                        })
                        .Where(i => i.MemRemaining > 0)
                        .OrderBy(i => i.MemRemaining)
                        .FirstOrDefault()
                        ?? throw new InvalidOperationException($"Insufficient memory on any Datacenter node for VM Template '{virtualMachineTemplate.Name}' ({vmMemorySize} bytes required).");

                        resourceAllocation.TotalMemoryAssigned[vmNode.Node.PVEResource.Node!] += vmMemorySize;
                        resourceAllocation.TotalStorageAssigned += vmStorageSize;

                        operations.Add(new CloneWorkspaceVirtualMachineOperation
                        {
                            TemplateEntry = virtualMachineTemplate,
                            TargetNode = vmNode.Node.PVEResource.Node!,
                            Index = index,
                            VirtualMachineDescriptor = virtualMachineDescriptor,
                            VirtualNetworkDescriptors = workspaceDescriptor.VirtualNetworks!
                        });

                        break;
                    }
                case VirtualMachineDescriptorOperation.Update:
                    {
                        var resource = existingWorkspaceEntry?.VirtualMachines?.FirstOrDefault(i => i.Name == virtualMachineDescriptor.Name)?.PVEResource ?? throw new InvalidOperationException($"Cannot update Workspace Virtual Machine '{virtualMachineDescriptor.Name}' because the existing Workspace entry is not provided.");

                        var vmMemorySize = resource.MaxMem ?? throw new InvalidOperationException($"Unable to determine memory requirements for Virtual Machine '{virtualMachineDescriptor.Name}'.");

                        if (virtualMachineDescriptor.MemoryMB != null)
                        {
                            //var requestedMemorySize = long.Parse(virtualMachineDescriptor.MemoryMB) * 1024L * 1024L;
                            //if (requestedMemorySize > vmMemorySize)
                            {
                                vmMemorySize = virtualMachineDescriptor.MemoryMB.Value * 1024L;
                            }
                        }

                        var vmNode = Nodes.FirstOrDefault(i => i.PVEResource.Node == resource.Node) ?? throw new InvalidOperationException($"Unable to determine Datacenter node for Virtual Machine '{virtualMachineDescriptor.Name}'.");
                        var memRemaining = ((vmNode.PVEResource.MaxMem ?? 0) * 0.80d) - (vmNode.PVEResource.Mem ?? 0) - vmMemorySize - resourceAllocation.TotalMemoryAssigned[vmNode.PVEResource.Node!];
                        if (memRemaining <= 0) throw new InvalidOperationException($"Insufficient memory on Datacenter node '{vmNode.PVEResource.Node}' for updating Virtual Machine '{virtualMachineDescriptor.Name}' ({memRemaining * -1} bytes required).");

                        resourceAllocation.TotalMemoryAssigned[vmNode.PVEResource.Node!] += (vmMemorySize - resource.MaxMem.Value);

                        operations.Add(new UpdateWorkspaceVirtualMachineOperation
                        {
                            VMID = resource.VmId ?? throw new InvalidOperationException($"Unable to determine VMID for Virtual Machine '{virtualMachineDescriptor.Name}'."),
                            TargetNode = vmNode.PVEResource.Node!,
                            Index = index,
                            VirtualMachineDescriptor = virtualMachineDescriptor,
                            VirtualNetworkDescriptors = workspaceDescriptor.VirtualNetworks!
                        });

                        break;
                    }
                case VirtualMachineDescriptorOperation.Remove:
                    {
                        var resource = existingWorkspaceEntry?.VirtualMachines?.FirstOrDefault(i => i.Name == virtualMachineDescriptor.Name)?.PVEResource ?? throw new InvalidOperationException($"Cannot remove Workspace Virtual Machine '{virtualMachineDescriptor.Name}' because the existing Workspace entry is not provided.");

                        operations.Add(new RemoveVirtualMachineOperation
                        {
                            PVEResource = resource
                        });

                        break;
                    }
                case VirtualMachineDescriptorOperation.None: break; // Do nothing
                default:
                    {
                        throw new NotImplementedException($"Virtual Machine Operation '{virtualMachineDescriptor.Operation}'");
                    }
            }
        }

        return operations.ToArray();
    }
}
