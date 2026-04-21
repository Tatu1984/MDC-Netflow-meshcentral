namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;

/// <summary>A Proxmox storage pool as reported by PDM.</summary>
/// <param name="Id">Stable pool identifier.</param>
/// <param name="ClusterId">Cluster the pool lives in.</param>
/// <param name="Name">Pool display name.</param>
/// <param name="Kind">Backing kind (e.g. lvm-thin, zfs, nfs, ceph).</param>
/// <param name="Health">Reported health (e.g. healthy, degraded).</param>
/// <param name="TotalBytes">Total capacity in bytes.</param>
/// <param name="UsedBytes">Used capacity in bytes.</param>
public sealed record PdmStoragePool(
    string Id,
    string ClusterId,
    string Name,
    string Kind,
    string Health,
    long TotalBytes,
    long UsedBytes);
