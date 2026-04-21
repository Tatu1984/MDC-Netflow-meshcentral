using System.Security.Claims;
using MDC.Core.Services.Providers.MeshCentral.Dto;
using MDC.Core.Services.Providers.ProxmoxDatacenterManager;
using MDC.Core.Services.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MDC.Core.Services.Providers.MeshCentral;

/// <summary>Resolution of a Mesh session mint — either success with a ticket, or a typed failure.</summary>
public enum MeshSessionOutcome
{
    /// <summary>A short-lived login URL was successfully minted.</summary>
    Ok,
    /// <summary>The VM is unknown to MDC.</summary>
    VmNotFound,
    /// <summary>The caller is not a member of the workspace that owns the VM.</summary>
    Forbidden,
    /// <summary>No MeshCentral agent is enrolled for this VM — caller should fall back to VNC.</summary>
    AgentNotEnrolled,
    /// <summary>A MeshCentral agent exists but is currently offline.</summary>
    AgentOffline,
}

/// <summary>Combined outcome + (on success) ticket.</summary>
/// <param name="Outcome">Classification of the mint attempt.</param>
/// <param name="Ticket">Present only when <paramref name="Outcome"/> is <see cref="MeshSessionOutcome.Ok"/>.</param>
/// <param name="WorkspaceId">Workspace the VM belongs to, when known.</param>
public sealed record MeshSessionResult(MeshSessionOutcome Outcome, MeshSessionTicket? Ticket, string? WorkspaceId);

/// <summary>
/// Application-layer policy around MeshCentral login minting. Enforces tier rules
/// and agent-state preconditions before asking MeshCentral for a ticket.
/// </summary>
public sealed class MeshSessionBroker
{
    private readonly IMeshCentralClient _mesh;
    private readonly IVmWorkspaceMap _vmMap;
    private readonly ITierResolver _tier;
    private readonly MeshCentralOptions _options;
    private readonly ILogger<MeshSessionBroker> _logger;

    /// <summary>Construct with Mesh + tier dependencies.</summary>
    public MeshSessionBroker(
        IMeshCentralClient mesh,
        IVmWorkspaceMap vmMap,
        ITierResolver tier,
        IOptions<MeshCentralOptions> options,
        ILogger<MeshSessionBroker> logger)
    {
        _mesh = mesh;
        _vmMap = vmMap;
        _tier = tier;
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>Mint a session URL for <paramref name="vmid"/>, enforcing tier rules and agent state.</summary>
    public async Task<MeshSessionResult> CreateSessionAsync(ClaimsPrincipal user, int vmid, CancellationToken ct = default)
    {
        var loc = await _vmMap.GetAsync(vmid, ct);
        if (loc is null)
        {
            return new MeshSessionResult(MeshSessionOutcome.VmNotFound, null, null);
        }

        var tier = await _tier.ResolveAsync(user, ct);
        if (tier.Kind == TierKind.WorkspaceMember && !tier.WorkspaceIds.Contains(loc.WorkspaceId, StringComparer.OrdinalIgnoreCase))
        {
            _logger.LogInformation("Mesh mint blocked: user not a member of {WorkspaceId} for VM {Vmid}", loc.WorkspaceId, vmid);
            return new MeshSessionResult(MeshSessionOutcome.Forbidden, null, loc.WorkspaceId);
        }

        var device = await _mesh.FindDeviceForVmAsync(vmid, ct);
        if (device is null)
        {
            return new MeshSessionResult(MeshSessionOutcome.AgentNotEnrolled, null, loc.WorkspaceId);
        }
        if (!device.Online)
        {
            return new MeshSessionResult(MeshSessionOutcome.AgentOffline, null, loc.WorkspaceId);
        }

        var ttl = TimeSpan.FromSeconds(_options.LoginTicketTtlSeconds);
        var ticket = await _mesh.MintLoginTicketAsync(device.NodeId, ttl, ct);
        return new MeshSessionResult(MeshSessionOutcome.Ok, ticket, loc.WorkspaceId);
    }

    /// <summary>Return the enrollment / online status of the Mesh agent for a VM without minting a ticket.</summary>
    public async Task<MeshDevice?> GetStatusAsync(int vmid, CancellationToken ct = default)
        => await _mesh.FindDeviceForVmAsync(vmid, ct);
}
