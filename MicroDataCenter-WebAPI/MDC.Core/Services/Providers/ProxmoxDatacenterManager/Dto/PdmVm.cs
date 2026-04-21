namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;

/// <summary>A VM as reported by PDM.</summary>
/// <param name="Vmid">Proxmox VMID (integer).</param>
/// <param name="NodeId">Host node identifier.</param>
/// <param name="ClusterId">Owning cluster identifier.</param>
/// <param name="Name">Guest display name.</param>
/// <param name="Status">Reported status (e.g. "running", "stopped").</param>
public sealed record PdmVm(
    int Vmid,
    string NodeId,
    string ClusterId,
    string Name,
    string Status);
