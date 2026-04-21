using MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;

namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager;

/// <summary>Read-only client over the Proxmox Datacenter Manager API.</summary>
public interface IPdmClient
{
    /// <summary>Every cluster known to PDM.</summary>
    Task<IReadOnlyList<PdmCluster>> ListClustersAsync(CancellationToken ct = default);

    /// <summary>All nodes in a cluster.</summary>
    Task<IReadOnlyList<PdmNode>> ListNodesAsync(string clusterId, CancellationToken ct = default);

    /// <summary>All VMs in a cluster.</summary>
    Task<IReadOnlyList<PdmVm>> ListVmsAsync(string clusterId, CancellationToken ct = default);

    /// <summary>Latest metrics sample for a single VM.</summary>
    Task<PdmMetricsSample> GetVmMetricsAsync(string clusterId, int vmid, CancellationToken ct = default);

    /// <summary>Latest metrics sample for a single node.</summary>
    Task<PdmMetricsSample> GetNodeMetricsAsync(string nodeId, CancellationToken ct = default);

    /// <summary>Recent PDM events, newest first.</summary>
    Task<IReadOnlyList<PdmEvent>> GetRecentEventsAsync(int take, CancellationToken ct = default);

    /// <summary>All storage pools across the fleet.</summary>
    Task<IReadOnlyList<PdmStoragePool>> ListStoragePoolsAsync(CancellationToken ct = default);

    /// <summary>Reachability probe. Returns false when PDM is unreachable rather than throwing.</summary>
    Task<bool> PingAsync(CancellationToken ct = default);
}
