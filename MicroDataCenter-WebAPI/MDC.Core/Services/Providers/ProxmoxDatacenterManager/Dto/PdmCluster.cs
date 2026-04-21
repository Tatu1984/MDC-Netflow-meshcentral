namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;

/// <summary>A Proxmox cluster as reported by PDM.</summary>
/// <param name="Id">Stable cluster identifier.</param>
/// <param name="Name">Human-friendly cluster name.</param>
/// <param name="QuorumState">Quorum state string (e.g. "quorate", "degraded").</param>
/// <param name="NodeCount">Number of member nodes.</param>
/// <param name="VmCount">Total number of guests across the cluster.</param>
/// <param name="CpuUsedPct">Aggregate CPU utilisation percentage.</param>
/// <param name="MemUsedPct">Aggregate memory utilisation percentage.</param>
public sealed record PdmCluster(
    string Id,
    string Name,
    string QuorumState,
    int NodeCount,
    int VmCount,
    double CpuUsedPct,
    double MemUsedPct);
