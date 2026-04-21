namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager;

/// <summary>Resolves the MDC workspace a PDM VM belongs to.</summary>
public interface IVmWorkspaceMap
{
    /// <summary>Workspace id owning the given PDM VMID, or null if unknown.</summary>
    Task<VmLocation?> GetAsync(int vmid, CancellationToken ct = default);

    /// <summary>All known VM → (cluster, workspace) mappings.</summary>
    Task<IReadOnlyList<VmLocation>> ListAsync(CancellationToken ct = default);
}

/// <summary>Where a VM lives.</summary>
/// <param name="Vmid">Proxmox VMID.</param>
/// <param name="ClusterId">PDM cluster id.</param>
/// <param name="WorkspaceId">MDC workspace id.</param>
public sealed record VmLocation(int Vmid, string ClusterId, string WorkspaceId);
