using MDC.Core.Services.Providers.MeshCentral.Dto;

namespace MDC.Core.Services.Providers.MeshCentral;

/// <summary>Trust-broker interface to MeshCentral. Implementations live only on the backend.</summary>
public interface IMeshCentralClient
{
    /// <summary>Look up the device linked to a given VirtualMachineEntry / vmid, or null if no agent is enrolled.</summary>
    Task<MeshDevice?> FindDeviceForVmAsync(int vmid, CancellationToken ct = default);

    /// <summary>Mint a short-lived login URL that the browser can redeem once against the MeshCentral server.</summary>
    Task<MeshSessionTicket> MintLoginTicketAsync(string nodeId, TimeSpan ttl, CancellationToken ct = default);

    /// <summary>All devices known to this MeshCentral instance (admin only).</summary>
    Task<IReadOnlyList<MeshDevice>> ListDevicesAsync(CancellationToken ct = default);

    /// <summary>Validate a previously minted ticket (used by the mock mesh web endpoint).</summary>
    bool TryRedeemTicket(string token, out MeshDevice? device);
}
