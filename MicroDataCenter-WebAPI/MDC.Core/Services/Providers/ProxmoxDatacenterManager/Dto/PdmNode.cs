namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;

/// <summary>A Proxmox node (host) within a cluster, as reported by PDM.</summary>
/// <param name="Id">Stable node identifier.</param>
/// <param name="ClusterId">Owning cluster identifier.</param>
/// <param name="Name">Human-friendly node name.</param>
/// <param name="Status">Reported status string (e.g. "online", "offline").</param>
/// <param name="VmCount">Number of guests hosted.</param>
/// <param name="CpuPct">Current CPU utilisation percentage.</param>
/// <param name="MemPct">Current memory utilisation percentage.</param>
/// <param name="UptimeSec">Uptime in seconds.</param>
public sealed record PdmNode(
    string Id,
    string ClusterId,
    string Name,
    string Status,
    int VmCount,
    double CpuPct,
    double MemPct,
    long UptimeSec);
