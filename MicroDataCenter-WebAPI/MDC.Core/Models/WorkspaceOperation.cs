using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using MDC.Shared.Models;
using System.Net;
using System.Text.Json;

namespace MDC.Core.Models;

internal abstract class WorkspaceOperation
{
    public virtual WorkspaceOperationTask[] GenerateTasks(IZeroTierService zeroTier, IMDCDatabaseService database, DatacenterEntry datacenterEntry, DbWorkspace dbWorkspace, CancellationToken cancellationToken) => Array.Empty<WorkspaceOperationTask>();
}

internal abstract class VirtualMachineOperation : WorkspaceOperation
{
    public required string TargetNode;
    public required VirtualNetworkDescriptor[] VirtualNetworkDescriptors;
    
    protected int? vmid = null;

    protected WorkspaceOperationTask StartVirtualMachineTask(IPVEClientService pve, bool waitForIPAddress, CancellationToken cancellationToken)
    {
        return new WorkspaceOperationTask
        {
            WorkspaceOperationTaskType = WorkspaceOperationTaskType.StartVirtualMachine,
            ExecuteAsync = async () =>
            {
                if (vmid == null) throw new InvalidOperationException($"VMID is null for cloned VM on node '{TargetNode}'");
                var vmStatus = await pve.QemuStatusStartAsync(TargetNode, vmid.Value, waitForIPAddress ? QemuWaitOptions.WaitForIPAddress : QemuWaitOptions.WaitForState, cancellationToken);
            }
        };
    }

    protected WorkspaceOperationTask[] UpdateRemoteNetworksTask(IZeroTierService zeroTierService, DatacenterEntry datacenterEntry, VirtualMachineDescriptor virtualMachineDescriptor, DbWorkspace dbWorkspace, CancellationToken cancellationToken)
    {
        List<WorkspaceOperationTask> tasks = new();

        // For each of the remote networks, if enabled, we need to add the VM to the ZeroTier network
        foreach (var networkAdapter in virtualMachineDescriptor.NetworkAdapters!.Where(i => i.EnableRemoteNetwork == true))
        {
            if (virtualMachineDescriptor.Name == null) throw new InvalidOperationException($"Virtual Machine Name cannot be null for VMID '{vmid}'");

            tasks.Add(new WorkspaceOperationTask
            {
                WorkspaceOperationTaskType = WorkspaceOperationTaskType.JoinZeroTierNetwork,
                ExecuteAsync = async () =>
                {
                    if (vmid == null) throw new InvalidOperationException($"VMID is null for VM '{virtualMachineDescriptor.Name}' on node '{TargetNode}'");
                    var dbVirtualNetwork = dbWorkspace.VirtualNetworks.FirstOrDefault(i => i.Name == networkAdapter.RefVirtualNetworkName) ?? throw new InvalidOperationException($"Virtual Network Name '{networkAdapter.RefVirtualNetworkName}' does not exist in Workspace {dbWorkspace.Address}");

                    if (dbVirtualNetwork.ZeroTierNetworkId == null)
                        throw new InvalidOperationException($"ZeroTier Network has not been created for Virtual Network '{dbVirtualNetwork.Name}' in Workspace {dbWorkspace.Address}");

                    // Install ZeroTier on the VM 
                    var installZeroTierResponse = await zeroTierService.InstallZeroTierAsync(datacenterEntry, TargetNode, vmid.Value, cancellationToken);

                    // Join to the ZeroTier Network
                    IPAddress[] ipAddresses = string.IsNullOrEmpty(networkAdapter.RemoteNetworkIPAddress) ? [] : [IPAddress.Parse(networkAdapter.RemoteNetworkIPAddress)];
                    var networkMembership = await zeroTierService.JoinNetworkAsync(datacenterEntry, TargetNode, vmid.Value, dbVirtualNetwork.ZeroTierNetworkId, virtualMachineDescriptor.Name, ipAddresses, datacenterEntry.DatacenterSettings, cancellationToken);
                }
            });
        }

        return tasks.ToArray();
    }

    protected WorkspaceOperationTask UpdateVirtualMachineConfigurationTask(DatacenterEntry datacenterEntry, string? name, int? cpuCores, int? memoryMB, PVEQemuConfigNetworkAdapter[] networkAdapters, int virtualMachineIndex, DbWorkspace dbWorkspace, bool removeOnFail, CancellationToken cancellationToken)
    {
        return new WorkspaceOperationTask
        {
            WorkspaceOperationTaskType = WorkspaceOperationTaskType.UpdateVirtualMachineConfiguration,
            ExecuteAsync = async () =>
            {
                if (vmid == null) throw new InvalidOperationException($"Cannot update Virtual Machine configuration on node '{TargetNode}' because specified VMID is null ");
                try
                {
                    var qemuConfig = await datacenterEntry.PVEClient.GetQemuConfigAsync(TargetNode, vmid.Value, cancellationToken) ?? throw new InvalidOperationException($"Unable to get Qemu Config for Workspace Address '{dbWorkspace.Address}' VM VMID '{vmid.Value}' on node '{TargetNode}'");

                    // Determine what needs to be updated in the Qemu Config
                    var updateQemuConfig = new PVEQemuConfig();

                    // If the name changed, update it
                    if (MDCHelper.ParseMDCVirtualMachineName(qemuConfig.Name, false, out var existingWorkspaceAddress, out var existingType, out var existingIndex, out var existingVMName))
                    {
                        if (name != null && existingVMName != name)
                        {
                            updateQemuConfig.Name = MDCHelper.FormatVirtualMachineName(existingWorkspaceAddress!.Value, existingType!, existingIndex!.Value, name);
                        }
                    }

                    // If Cores or Memory are specified, update those settings
                    if (cpuCores.HasValue && qemuConfig.Cores != cpuCores.Value)
                        updateQemuConfig.Cores = cpuCores.Value;
                    
                    if (memoryMB != null && updateQemuConfig.Memory != memoryMB.ToString())
                    {
                        updateQemuConfig.Memory = memoryMB.ToString();
                    } 

                    var existingNetworkAdapters = qemuConfig.ParseNetworkAdapters();
                    var deleteProperties = existingNetworkAdapters.Select(i => i.DeviceId).Except(networkAdapters.Select(i => i.DeviceId)).ToArray();
                    await datacenterEntry.PVEClient.UpdateQemuConfigAsync(TargetNode, vmid.Value, updateQemuConfig, networkAdapters, deleteProperties, cancellationToken);
                }
                catch (Exception ex)
                {
                    if (removeOnFail)
                    {
                        await datacenterEntry.PVEClient.DeleteQemuAsync(TargetNode, vmid.Value, true, true, cancellationToken);
                    }

                    throw new InvalidOperationException($"Failed updating Virtual Machine configuration on node '{TargetNode}' with VMID '{vmid.Value}'.  ", ex);
                }
            }
        };
    }
}

internal abstract class CloneVirtualMachineOperation : VirtualMachineOperation
{
    public required VirtualMachineTemplateEntry TemplateEntry;

    protected WorkspaceOperationTask CloneVirtualMachineTask(IPVEClientService pve, string virtualMachineName, int order, CancellationToken cancellationToken)
    {
        if (TemplateEntry.PVEResource == null)
            throw new InvalidOperationException($"Template PVE Resource is null for Template '{TemplateEntry.Name}'");
        if (TemplateEntry.PVEResource.Node == null)
            throw new InvalidOperationException($"Template Node is null for Template '{TemplateEntry.Name}'");
        if (TemplateEntry.PVEResource.VmId == null)
            throw new InvalidOperationException($"Template VMID is null for Template '{TemplateEntry.Name}'");

        return new WorkspaceOperationTask
        {
            WorkspaceOperationTaskType = WorkspaceOperationTaskType.CloneVirtualMachine,
            Order = order,
            ExecuteAsync = async () =>
            {
                (vmid, var upid) = await pve.CreateQemuCloneAsync(TemplateEntry.PVEResource.Node!, TemplateEntry.PVEResource.VmId.Value, virtualMachineName, TargetNode, cancellationToken);
                await pve.WaitForTaskAsync(TemplateEntry.PVEResource.Node!, upid, cancellationToken);

                var existingConfig = await pve.GetQemuConfigAsync(TargetNode, vmid.Value, cancellationToken);
                var newConfig = new PVEQemuConfig { OnBoot = 0 };
                if (existingConfig != null)
                {
                    var storage = existingConfig.ParseStorage();
                    foreach (var entry in storage)
                    {
                        if (entry.OtherParameters.TryGetValue("media", out var media) && media == "cdrom" && entry.StorageId != "none")
                        {
                            // need to set CDROM media to "none"
                            newConfig.UnknownProperties.Add($"{entry.ControllerType}{entry.ControllerIndex}", JsonElement.Parse($"\"none,media=cdrom\""));
                        }
                    }
                }
                // always set OnBoot to false until after the cloned VM has been configured
                await pve.UpdateQemuConfigAsync(TargetNode, vmid.Value, newConfig, [], [], cancellationToken);
            }
        };
    }
}

internal class CloneGatewayVirtualMachineOperation : CloneVirtualMachineOperation
{
    public required int Index;

    public override WorkspaceOperationTask[] GenerateTasks(IZeroTierService zeroTierService, IMDCDatabaseService database, DatacenterEntry datacenterEntry, DbWorkspace dbWorkspace, CancellationToken cancellationToken)
    {
        var VirtualNetworkDescriptor = VirtualNetworkDescriptors.SingleOrDefault() ?? throw new InvalidOperationException($"Gateway Virtual Machine must have one Virtual Network Descriptor");
        List<WorkspaceOperationTask> tasks = new();
        
        if (VirtualNetworkDescriptor.Name == null) throw new InvalidOperationException($"Virtual Network Name is null for Virtual Network Index '{Index}'");

        tasks.Add(CloneVirtualMachineTask(datacenterEntry.PVEClient, MDCHelper.FormatVirtualMachineName(dbWorkspace.Address, MDCHelper.MDCResourceType.Gateway, Index, VirtualNetworkDescriptor.Name), 2, cancellationToken));

        // Don't use UpdateVirtualMachineConfigurationTask because the gateway has special handling for its network adapters
        tasks.Add(new WorkspaceOperationTask
        {
            WorkspaceOperationTaskType = WorkspaceOperationTaskType.UpdateVirtualMachineConfiguration,
            ExecuteAsync = async () =>
            {
                if (vmid == null) throw new InvalidOperationException($"VMID is null for cloned Virtual Network Gateway VM '{VirtualNetworkDescriptor.Name}' on node '{TargetNode}'");
                var qemuConfig = await datacenterEntry.PVEClient.GetQemuConfigAsync(TargetNode, vmid.Value, cancellationToken) ?? throw new InvalidOperationException($"Unable to get Qemu Config for Workspace Address '{dbWorkspace.Address}' VM VMID '{vmid.Value}' on node '{TargetNode}'");

                var (wanNetworkAdapter, lanNetworkAdapter) = qemuConfig.ParseGatewayNetworkAdapters();
                if (wanNetworkAdapter == null)
                {
                    var deviceIds = Enumerable.Range(0, 2).Select(i => $"vnet{i}");
                    var deviceIndex = Enumerable.Range(0, 2);
                    wanNetworkAdapter = new PVEQemuConfigNetworkAdapter
                    {
                        DeviceId = deviceIds.Except([lanNetworkAdapter.DeviceId]).First(),
                        DeviceIndex = deviceIndex.Except([lanNetworkAdapter.DeviceIndex]).First()
                    };
                }

                switch (VirtualNetworkDescriptor?.Gateway?.WANNetworkType)
                {
                    case VirtualNetworkGatewayWANNetworkType.Egress:
                        {
                            wanNetworkAdapter.Bridge = datacenterEntry.DatacenterSettings.WanBridgeName;
                            wanNetworkAdapter.Tag = datacenterEntry.DatacenterSettings.WanBridgeTag;
                            break;
                        }
                    case VirtualNetworkGatewayWANNetworkType.Internal:
                        {
                            wanNetworkAdapter.Bridge = datacenterEntry.DatacenterSettings.LanBridgeName;
                            // Note: These should be already validated from the Normalize() phase before Virtual Machines are created, and not fail at this stage, leaving an incomplete Workspace creation
                            var dbVirtualNetwork = dbWorkspace.VirtualNetworks.FirstOrDefault(i => i.Name == VirtualNetworkDescriptor.Gateway.RefInternalWANVirtualNetworkName!) ?? throw new InvalidOperationException($"Virtual Network Name '{VirtualNetworkDescriptor.Gateway.RefInternalWANVirtualNetworkName}' does not existing in Workspace {dbWorkspace.Address}");
                            wanNetworkAdapter.Tag = dbVirtualNetwork.Tag;
                            break;
                        }
                    case VirtualNetworkGatewayWANNetworkType.Public:
                        {
                            wanNetworkAdapter.Bridge = datacenterEntry.DatacenterSettings.PublicBridgeName;
                            wanNetworkAdapter.Tag = datacenterEntry.DatacenterSettings.PublicBridgeTag;
                            break;
                        }
                    default:
                        throw new InvalidOperationException($"Unknown Gateway WAN Type '{VirtualNetworkDescriptor?.Gateway?.WANNetworkType}'");
                }

                wanNetworkAdapter.IsFirewallEnabled = true;
                wanNetworkAdapter.IsDisconnected = false;

                lanNetworkAdapter.Bridge = datacenterEntry.DatacenterSettings.LanBridgeName;
                lanNetworkAdapter.Tag = dbWorkspace.VirtualNetworks.Single(i => i.Name == VirtualNetworkDescriptor.Name).Tag;
                lanNetworkAdapter.IsFirewallEnabled = true;
                lanNetworkAdapter.IsDisconnected = false;
                await datacenterEntry.PVEClient.UpdateQemuConfigAsync(TargetNode, vmid.Value, null, [wanNetworkAdapter, lanNetworkAdapter], [], cancellationToken);
            }
        });

        tasks.Add(StartVirtualMachineTask(datacenterEntry.PVEClient, false, cancellationToken));

        return tasks.ToArray();
    }
}

internal class CloneWorkspaceVirtualMachineOperation : CloneVirtualMachineOperation
{
    public required int Index;
    public required VirtualMachineDescriptor VirtualMachineDescriptor;

    public override WorkspaceOperationTask[] GenerateTasks(IZeroTierService zeroTierService, IMDCDatabaseService database, DatacenterEntry datacenterEntry, DbWorkspace dbWorkspace, CancellationToken cancellationToken)
    {
        List<WorkspaceOperationTask> tasks = new();

        if (VirtualMachineDescriptor.Name == null) throw new InvalidOperationException($"Virtual Machine Name is null for Virtual Machine Index '{Index}'");
        
        var virtualMachineName = MDCHelper.FormatVirtualMachineName(dbWorkspace.Address, MDCHelper.MDCResourceType.VirtualMachine, Index, VirtualMachineDescriptor.Name);

        // Remove all of the existing network devices and add new ones
        var networkAdapters = VirtualMachineDescriptor.NetworkAdapters!.Select(adapter => new PVEQemuConfigNetworkAdapter
        {
            DeviceId = adapter.Name!,
            DeviceIndex = Index,    // Note: This assumes one network adapter per VM for now.  This should be updated to support multiple adapters such as "net0", "net1", etc.
            Bridge = datacenterEntry.DatacenterSettings.LanBridgeName,
            Tag = dbWorkspace.VirtualNetworks.FirstOrDefault(i => i.Name == adapter.RefVirtualNetworkName)?.Tag ?? throw new InvalidOperationException($"Virtual Network Name '{adapter.RefVirtualNetworkName}' does not exist in Workspace {dbWorkspace.Address}"),
            IsFirewallEnabled = true,
            IsDisconnected = false,
            Model = "virtio"
        })
        .ToArray();

        tasks.Add(CloneVirtualMachineTask(datacenterEntry.PVEClient, virtualMachineName, 3, cancellationToken));

        tasks.Add(UpdateVirtualMachineConfigurationTask(datacenterEntry, null, VirtualMachineDescriptor.CPUCores, VirtualMachineDescriptor.MemoryMB, networkAdapters, Index, dbWorkspace, true, cancellationToken));

        tasks.AddRange(UpdateRemoteNetworksTask(zeroTierService, datacenterEntry, VirtualMachineDescriptor, dbWorkspace, cancellationToken));

        var waitForIPAddress = VirtualMachineDescriptor.NetworkAdapters!.Any(i => i.EnableRemoteNetwork == true);
        tasks.Add(StartVirtualMachineTask(datacenterEntry.PVEClient, waitForIPAddress, cancellationToken));

        return tasks.ToArray();
    }
}

internal class UpdateWorkspaceVirtualMachineOperation : VirtualMachineOperation
{
    public required int VMID;
    public required int Index;
    public required VirtualMachineDescriptor VirtualMachineDescriptor;

    public override WorkspaceOperationTask[] GenerateTasks(IZeroTierService zeroTierService, IMDCDatabaseService database, DatacenterEntry datacenterEntry, DbWorkspace dbWorkspace, CancellationToken cancellationToken)
    {
        List<WorkspaceOperationTask> tasks = new();

        if (VirtualMachineDescriptor.Name == null) throw new InvalidOperationException($"Virtual Machine Name cannot be null for Virtual Machine VMID '{VMID}'");

        // Be sure to set the protected vmid field for use in other methods
        vmid = VMID;

        // Remove all of the existing network devices and add new ones
        var networkAdapters = VirtualMachineDescriptor.NetworkAdapters!.Select(adapter => new PVEQemuConfigNetworkAdapter
        {
            DeviceId = adapter.Name!,
            DeviceIndex = Index,    // Note: This assumes one network adapter per VM for now.  This should be updated to support multiple adapters such as "net0", "net1", etc.
            Bridge = datacenterEntry.DatacenterSettings.LanBridgeName,
            Tag = dbWorkspace.VirtualNetworks.FirstOrDefault(i => i.Name == adapter.RefVirtualNetworkName)?.Tag ?? throw new InvalidOperationException($"Virtual Network Name '{adapter.RefVirtualNetworkName}' does not exist in Workspace {dbWorkspace.Address}"),
            IsFirewallEnabled = true,
            IsDisconnected = false,
            Model = "virtio"
        })
        .ToArray();

        tasks.Add(UpdateVirtualMachineConfigurationTask(datacenterEntry, VirtualMachineDescriptor.Name, VirtualMachineDescriptor.CPUCores, VirtualMachineDescriptor.MemoryMB, networkAdapters, Index, dbWorkspace, false, cancellationToken));

        tasks.AddRange(UpdateRemoteNetworksTask(zeroTierService, datacenterEntry, VirtualMachineDescriptor, dbWorkspace, cancellationToken));

        //var waitForIPAddress = VirtualMachineDescriptor.NetworkAdapters!.Any(i => i.EnableRemoteNetwork == true);
        //tasks.Add(StartVirtualMachineTask(datacenterEntry.PVEClient, waitForIPAddress, cancellationToken));

        return tasks.ToArray();
    }
}

internal class RemoveVirtualMachineOperation : WorkspaceOperation
{
    public required PVEResource PVEResource;

    public override WorkspaceOperationTask[] GenerateTasks(IZeroTierService zeroTier, IMDCDatabaseService database, DatacenterEntry datacenterEntry, DbWorkspace dbWorkspace, CancellationToken cancellationToken)
    {
        List<WorkspaceOperationTask> tasks = new();

        tasks.Add(new WorkspaceOperationTask
        {
            WorkspaceOperationTaskType = WorkspaceOperationTaskType.RemoveVirtualMachine,
            ExecuteAsync = async () =>
            {
                if (PVEResource.Node == null) throw new InvalidOperationException($"Node is null for VM on node '{PVEResource.Id}'");
                if (PVEResource.VmId == null) throw new InvalidOperationException($"VMID is null for VM on node '{PVEResource.Node}'");

                var upidStop = await datacenterEntry.PVEClient.QemuStatusStopAsync(PVEResource.Node, PVEResource.VmId.Value, true, cancellationToken);
                await datacenterEntry.PVEClient.WaitForTaskAsync(PVEResource.Node, upidStop, cancellationToken);

                var upidDelete = await datacenterEntry.PVEClient.DeleteQemuAsync(PVEResource.Node, PVEResource.VmId.Value, true, true, cancellationToken);
                await datacenterEntry.PVEClient.WaitForTaskAsync(PVEResource.Node, upidDelete, cancellationToken);
            }
        });

        return tasks.ToArray();
    }
}

internal class AddRemoteNetworkOperation : WorkspaceOperation
{
    public required VirtualNetworkDescriptor VirtualNetworkDescriptor;

    public override WorkspaceOperationTask[] GenerateTasks(IZeroTierService zeroTier, IMDCDatabaseService database, DatacenterEntry datacenterEntry, DbWorkspace dbWorkspace, CancellationToken cancellationToken)
    {
        List<WorkspaceOperationTask> tasks = new();

        // Create the ZeroTier Network
        tasks.Add(new WorkspaceOperationTask
        {
            WorkspaceOperationTaskType = WorkspaceOperationTaskType.CreateZeroTierNetwork,
            ExecuteAsync = async () =>
            {
                var dbVirtualNetwork = dbWorkspace.VirtualNetworks.FirstOrDefault(i => i.Name == VirtualNetworkDescriptor.Name) ?? throw new InvalidOperationException($"Virtual Network Name '{VirtualNetworkDescriptor.Name}' does not exist in Workspace {dbWorkspace.Address}");
                var networkName = MDCHelper.FormatZeroTierNetworkName(datacenterEntry.ClusterName, dbWorkspace.Address, dbVirtualNetwork.Index);

                var createdNetwork = await zeroTier.CreateNetworkAsync(networkName, VirtualNetworkDescriptor, datacenterEntry.DatacenterSettings, cancellationToken);
                dbVirtualNetwork.ZeroTierNetworkId = createdNetwork.Id;
                await database.UpdateVirtualNetworkAsync(dbVirtualNetwork.Id, cancellationToken);
            }
        });

        return tasks.ToArray();
    }
}

internal class UpdateRemoteNetworkOperation : WorkspaceOperation
{
    public required VirtualNetworkDescriptor VirtualNetworkDescriptor;
    public required string ZeroTierNetworkId;

    public override WorkspaceOperationTask[] GenerateTasks(IZeroTierService zeroTier, IMDCDatabaseService database, DatacenterEntry datacenterEntry, DbWorkspace dbWorkspace, CancellationToken cancellationToken)
    {
        // No tasks to perform on the PVE side for adding a remote network
        return Array.Empty<WorkspaceOperationTask>();
    }
}

internal class RemoveRemoteNetworkOperation : WorkspaceOperation
{
    public required VirtualNetworkDescriptor VirtualNetworkDescriptor;
    public required string ZeroTierNetworkId;

    public override WorkspaceOperationTask[] GenerateTasks(IZeroTierService zeroTier, IMDCDatabaseService database, DatacenterEntry datacenterEntry, DbWorkspace dbWorkspace, CancellationToken cancellationToken)
    {
        // No tasks to perform on the PVE side for adding a remote network
        return Array.Empty<WorkspaceOperationTask>();
    }
}

internal enum WorkspaceOperationTaskType
{
    CloneVirtualMachine,    // Must be done synchronously, as we need the VMID for subsequent tasks
    UpdateVirtualMachineConfiguration,
    StartVirtualMachine,
    RemoveVirtualMachine,
    CreateZeroTierNetwork,
    RemoveZeroTierNetwork,  // TODO
    JoinZeroTierNetwork,
    LeaveZeroTierNetwork    // TODO
}

internal class WorkspaceOperationTask
{
    public required WorkspaceOperationTaskType WorkspaceOperationTaskType;
    public int Order = 0;
    public required Func<Task> ExecuteAsync;
}
