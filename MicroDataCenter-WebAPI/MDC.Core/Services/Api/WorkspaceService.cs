using MDC.Core.Models;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.DatacenterFactory;
using MDC.Core.Services.Providers.DtoEnrichment;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using Microsoft.EntityFrameworkCore;
using System.Net.NetworkInformation;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Api;

internal class WorkspaceService(IDatacenterFactoryService datacenterFactoryService, IMDCDatabaseService databaseService, IZeroTierService zeroTier, ITenantContext tenantContext, IDtoEnrichmentService dtoEnrichment) : IWorkspaceService
{
    public async Task<Workspace> CreateAsync(CreateWorkspaceParameters createWorkspaceParameters, CancellationToken cancellationToken = default)
    {
        var dbSite = await databaseService.FindSiteAsync(createWorkspaceParameters.SiteId, cancellationToken) ?? throw new InvalidOperationException($"Site with Id '{createWorkspaceParameters.SiteId}' not found in the database.");

        if (!dbSite.Organizations.Any(i => i.Id == createWorkspaceParameters.OrganizationId))
            throw new InvalidOperationException($"OrganizationId '{createWorkspaceParameters.OrganizationId}' does not exist for Site {createWorkspaceParameters.SiteId}");

        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryAsync(dbSite, cancellationToken);

        List<Func<Task>> actions = new();

        // 1. Validate the Workspace creation parameters
        actions.Add(async () => await Task.Run(createWorkspaceParameters.Validate));

        // 2. Compute request against available capacity
        WorkspaceOperation[] workspaceOperations = [];
        actions.Add(async () => await Task.Run(() => workspaceOperations = datacenterEntry.ComputeWorkspaceOperations(createWorkspaceParameters.Descriptor, null)));
        
        // 3. [Database] Create Database rows for Workspace and Virtual Network VLANs to reserve the Workspace resources
        DbWorkspace? dbWorkspace = null;
        actions.Add(async () => dbWorkspace = await databaseService.CreateWorkspaceAsync(datacenterEntry.DbSite.Id, createWorkspaceParameters.OrganizationId, createWorkspaceParameters.Descriptor.Name, createWorkspaceParameters.Descriptor.Description, createWorkspaceParameters.Descriptor.VirtualNetworks!.Select(i => i.Name!).ToArray(), datacenterEntry.DatacenterSettings,cancellationToken));

        // 4. [PVE] Create Virtual Machines
        actions.Add(async () => await ApplyWorkspaceOperationsAsync(workspaceOperations, dbWorkspace!, datacenterEntry, cancellationToken));

    
        // Execute all of the actions
        foreach (var action in actions)
        {
            await action();
        }

        return await GetByIdAsync(dbWorkspace!.Id, cancellationToken) ?? throw new InvalidOperationException($"Unable to retrieve Workspace Address '{dbWorkspace.Address}' after creation.");
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(id, false, cancellationToken);
        var workspace = datacenterEntry.Workspaces.Single();

        if (workspace.Locked)
            throw new InvalidOperationException($"Workspace Id '{id}' is locked and cannot be modified.");

        // Stop the VMs
        foreach (var re in workspace.ResourceEntries.Where(i => i.PVEResource != null))
        {
            var upid = await datacenterEntry.PVEClient.QemuStatusStopAsync(re.PVEResource!.Node!, re.PVEResource!.VmId!.Value, true, cancellationToken);
            await datacenterEntry.PVEClient.WaitForTaskAsync(re.PVEResource!.Node!, upid, cancellationToken);
        }

        // Remove the VMs
        foreach (var re in workspace.ResourceEntries.Where(i => i.PVEResource != null))
        {
            var upid = await datacenterEntry.PVEClient.DeleteQemuAsync(re.PVEResource!.Node!, re.PVEResource!.VmId!.Value, true, true, cancellationToken);
            await datacenterEntry.PVEClient.WaitForTaskAsync(re.PVEResource!.Node!, upid, cancellationToken);
        }

        // Remove the ZeroTier Network from the Controller
        foreach (var virtualNetwork in workspace.VirtualNetworks)
        {
            if (virtualNetwork.DbVirtualNetwork?.ZeroTierNetworkId == null)
            {
                continue;
            }
            var networks = await zeroTier.GetNetworksAsync(cancellationToken);
            var existingNetwork = networks.FirstOrDefault(i => i.Id == virtualNetwork.DbVirtualNetwork.ZeroTierNetworkId);
            if (existingNetwork != null)
            {
                await zeroTier.DeleteNetworkAsync(virtualNetwork.DbVirtualNetwork.ZeroTierNetworkId, cancellationToken);
            }
        }

        // Delete the Database row
        var rows = await databaseService.DeleteWorkspaceAsync(workspace.DbWorkspace!.Id, cancellationToken);
    }

    public async Task<IEnumerable<Workspace>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        // Query
        var query = databaseService.GetAllWorkspaces();

        // Project
        var dtoQuery = query.Select(DtoProjections.ToWorkspace);

        // Apply OData clauses and Materialize to DTO
        var results = tenantContext.ApplyToAndMaterialize<Workspace>(dtoQuery);

        // Enrich
        await dtoEnrichment.EnrichAsync(results, false, cancellationToken);

        return results;
    }    

    public async Task<Workspace?> GetByIdAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        // Query
        var query = databaseService.GetAllWorkspaces().Where(dbWorkspace => dbWorkspace.Id == workspaceId);

        // Project
        var dtoQuery = query.Select(DtoProjections.ToWorkspace);

        // Apply OData clauses and Materialize to DTO
        var results = tenantContext.ApplyToAndMaterialize<Workspace>(dtoQuery);

        // Enrich
        await dtoEnrichment.EnrichAsync(results, true, cancellationToken);

        return results.SingleOrDefault() ?? throw new InvalidOperationException($"Workspace Id '{workspaceId}' not found.");
    }

    public async Task<WorkspaceDescriptor?> GetWorkspaceDescriptorAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        // Query
        var query = databaseService.GetAllWorkspaces().Where(dbWorkspace => dbWorkspace.Id == workspaceId);

        // Project
        var dtoQuery = query.Select(DtoProjections.ToWorkspace);

        // Apply OData clauses and Materialize to DTO
        var results = await dtoQuery.ToListAsync(cancellationToken);

        // Enrich
        await dtoEnrichment.EnrichAsync(results, true, cancellationToken);

        var workspace = results.SingleOrDefault() ?? throw new InvalidOperationException($"Workspace Id '{workspaceId}' not found.");

        // Project and Materialize to DTO
        var workspaceDescriptor = new WorkspaceDescriptor
        {
            Name = workspace.Name,
            Description = workspace.Description,
            VirtualNetworks = workspace.VirtualNetworks.Select(vnet => new VirtualNetworkDescriptor
            {
                Name = vnet.Name,
                EnableRemoteNetwork = vnet.ZeroTierNetworkId != null,
                Gateway = vnet.GatewayStatus == null? null : new VirtualNetworkGatewayDescriptor
                {
                    TemplateName = vnet.TemplateName,
                    TemplateRevision = vnet.TemplateRevision,
                    WANNetworkType = vnet.GatewayWANNetworkType,
                    RefInternalWANVirtualNetworkName = workspace.VirtualNetworks.FirstOrDefault(i => i.Id == vnet.GatewayWANVirtualNetworkId)?.Name
                }
                // From ZeroTier during EnrichAsync
                //      RemoteNetworkAddressCIDR
                //      RemoteNetworkIPRangeEnd
                //      RemoteNetworkIPRangeStart
            }).ToArray(),
            VirtualMachines = workspace.VirtualMachines?.Select(vm => new VirtualMachineDescriptor
            {
                Name = vm.Name,
                CPUCores = vm.Cores,
                MemoryMB = vm.Memory == null ? null : int.Parse(vm.Memory),
                TemplateName = vm.TemplateName,
                TemplateRevision = vm.TemplateRevision,
                NetworkAdapters = vm.NetworkAdapters?.Select(na => new VirtualMachineNetworkAdapterDescriptor
                {
                    Name = na.Name,
                    IsDisconnected = na.IsDisconnected,
                    MACAddress = na.MACAddress,
                    IsFirewallEnabled = na.IsFirewallEnabled,
                    RefVirtualNetworkName = workspace.VirtualNetworks.FirstOrDefault(vnet => vnet.Id == na.VirtualNetworkId)?.Name
                    // From ZeroTier during EnrichAsync
                    //      EnableRemoteNetwork
                    //      RemoteNetworkIPAddress = networkInterfaces?.FirstOrDefault(ni => ni.Name.StartsWith("zt") && ni.IPAddress?.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)?.IPAddress?.ToString()
                })
                .ToArray()
            }).ToArray()
        };

        // Enrich
        await dtoEnrichment.EnrichAsync(workspaceDescriptor, workspace, cancellationToken);

        return workspaceDescriptor;



        //var workspace = await GetByIdAsync(workspaceId, cancellationToken);
        //if (workspace == null) throw new InvalidOperationException($"Workspace Descriptor is not available for Workspace Id '{workspaceId}'");

        //var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(workspaceId, false, cancellationToken);

        //var workspaceEntry = datacenterEntry.Workspaces.Single(w => w.DbWorkspace!.Id == workspaceId);
        //if (workspaceEntry.WorkspaceDescriptor == null)
        //    throw new InvalidOperationException($"Workspace Descriptor is not available for Workspace Id '{workspaceId}'");

        //return workspaceEntry.WorkspaceDescriptor;
    }

    public async Task UpdateAsync(Guid workspaceId,JsonNode delta, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(workspaceId, true, cancellationToken);
        
        var workspaceEntry = datacenterEntry.Workspaces.Single(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry.WorkspaceDescriptor == null)
            throw new InvalidOperationException($"Workspace Descriptor is not available for Workspace Id '{workspaceId}'");

        if (workspaceEntry.Locked)
            throw new InvalidOperationException($"Workspace Id '{workspaceId}' is locked and cannot be modified.");

        var workspaceDescriptor = MDCHelper.Patch(workspaceEntry.WorkspaceDescriptor, delta);

        List<Func<Task>> actions = new();

        // 1. Validate the Workspace creation parameters
        actions.Add(async () => await Task.Run(workspaceDescriptor.Validate));

        // 2. Compute request against available capacity
        WorkspaceOperation[] workspaceOperations = [];
        actions.Add(async () => await Task.Run(() => workspaceOperations = datacenterEntry.ComputeWorkspaceOperations(workspaceDescriptor, workspaceEntry)));

        // 3. [Database] Update Database rows for Workspace and Virtual Network VLANs to reserve the Workspace resources
        DbWorkspace? dbWorkspace = null;
        actions.Add(async () => dbWorkspace = await databaseService.UpdateWorkspaceAsync(datacenterEntry, workspaceId, workspaceDescriptor, cancellationToken));

        // 4. [PVE] Create Virtual Machines
        actions.Add(async () => await ApplyWorkspaceOperationsAsync(workspaceOperations, dbWorkspace!, datacenterEntry, cancellationToken));

        // Execute all of the actions
        foreach (var action in actions)
        {
            await action();
        }
    }

    public async Task SetWorkspaceLockAsync(Guid workspaceId, bool locked, CancellationToken cancellationToken = default)
    {
        await datacenterFactoryService.SetWorkspaceLockAsync(workspaceId, locked, cancellationToken);
    }

    public async Task<bool> GetWorkspaceLockAsync(Guid workspaceId, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(workspaceId, false, cancellationToken);
        var workspaceEntry = datacenterEntry.Workspaces.FirstOrDefault(w => w.DbWorkspace!.Id == workspaceId);
        if (workspaceEntry == null)
        {
            throw new InvalidOperationException("Workspace Not Found");
        }

        return workspaceEntry.Locked;
    }

    public async Task<VNCSession> InitializeVNCSessionAsync(Guid workspaceId, int virtualMachineIndex, CancellationToken cancellationToken = default)
    {
        return await datacenterFactoryService.CreateVNCProxyAsync(workspaceId, virtualMachineIndex, cancellationToken);
    }

    public async Task<RunCommandResponse[]> RunCommandAsync(Guid workspaceId, RunCommandDescriptor runCommandDescriptor, CancellationToken cancellationToken = default)
    {
        var datacenterEntry = await datacenterFactoryService.GetDatacenterEntryByWorkspaceIdAsync(workspaceId, false, cancellationToken);
        var workspace = datacenterEntry.Workspaces.Single();

        var virtualMachine = workspace.VirtualMachines.FirstOrDefault(i => i.Index == runCommandDescriptor.VirtualMachineIndex) ?? throw new InvalidOperationException($"Workspace Id '{workspaceId}' Virtual Machine Index {runCommandDescriptor.VirtualMachineIndex} not found.");

        var qemuStatus = await datacenterEntry.PVEClient.GetQemuStatusCurrentAsync(virtualMachine.PVEResource!.Node!, virtualMachine.PVEResource.VmId!.Value, cancellationToken);

        if (!(qemuStatus.Qmpstatus == "running"))
            throw new InvalidOperationException($"Workspace Id '{workspaceId}' Virtual Machine Index {runCommandDescriptor.VirtualMachineIndex} VM is not running.");
        if (qemuStatus.Agent != 1)
            throw new InvalidOperationException($"Workspace Id '{workspaceId}' Virtual Machine Index {runCommandDescriptor.VirtualMachineIndex} Agent is not ready.");

        List<RunCommandResponse> responses = new List<RunCommandResponse>();
        foreach (var command in runCommandDescriptor.Commands)
        {
            var result = await datacenterEntry.PVEClient.QemuAgentExecAsync(virtualMachine.PVEResource!.Node!, virtualMachine.PVEResource.VmId!.Value, command, cancellationToken);
            responses.Add(new RunCommandResponse
            { 
                Output = result.Output,
                ExitCode = result.ExitCode,
                ErrorMessage = result.ErrorMessage,
                Elapsed = result.Elapsed,
            });
        }
        return responses.ToArray();
    }

    #region Private Methods

    private async Task ApplyWorkspaceOperationsAsync(WorkspaceOperation[] workspaceOperations, DbWorkspace dbWorkspace, DatacenterEntry datacenterEntry, CancellationToken cancellationToken = default)
    {
        List<WorkspaceOperationTask> workspaceOperationTasks = new List<WorkspaceOperationTask>();

        foreach (var operation in workspaceOperations)
        {
            workspaceOperationTasks.AddRange(operation.GenerateTasks(zeroTier, databaseService, datacenterEntry, dbWorkspace, cancellationToken));
        }

        // Stop all of the VMs that are going to be modified or deleted
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.RemoveVirtualMachine).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));

        // Clone VM Must be done synchronously to avoid VMID conflicts
        foreach (var task in workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.CloneVirtualMachine).OrderBy(i => i.Order))
        {
            await task.ExecuteAsync();
        }

        // Update the VM Configurations
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.UpdateVirtualMachineConfiguration).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));

        // Create any ZeroTier Networks
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.CreateZeroTierNetwork).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));

        // Start the VMs
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.StartVirtualMachine).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));

        // Join ZeroTier Networks
        await Task.WhenAll(
            workspaceOperationTasks.Where(t => t.WorkspaceOperationTaskType == WorkspaceOperationTaskType.JoinZeroTierNetwork).OrderBy(i => i.Order)
            .Select(entry => entry.ExecuteAsync()));
    }
    #endregion
}
