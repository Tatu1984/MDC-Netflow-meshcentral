using System.Collections.Concurrent;
using MDC.Core.Services.Providers.MeshCentral.Dto;
using Microsoft.Extensions.Options;

namespace MDC.Core.Services.Providers.MeshCentral;

/// <summary>
/// Deterministic in-process MeshCentral stand-in. Owns a mutable device
/// registry (seeded with a few cluster-alpha VMs) and an in-memory ticket
/// store. The mock mesh web endpoint looks up tokens issued here. New
/// devices can be added at runtime by <see cref="MeshAgentEnrollmentService"/>
/// so newly-created VMs appear enrolled without manual steps.
/// </summary>
public sealed class MockMeshCentralClient : IMeshCentralClient
{
    private readonly ConcurrentDictionary<int, MeshDevice> _inventory = new();
    private readonly ConcurrentDictionary<string, (MeshDevice Device, DateTime ExpiresAtUtc)> _tickets = new();
    private readonly MeshCentralOptions _options;

    /// <summary>Construct with the active options.</summary>
    public MockMeshCentralClient(IOptions<MeshCentralOptions> options)
    {
        _options = options.Value;
        // Seed with the same inventory the earlier phases were built around.
        SeedDevice(100, "ws-alpha", "vm-pve-a1-0", online: true,  DateTime.UtcNow.AddMinutes(-1));
        SeedDevice(101, "ws-alpha", "vm-pve-a1-1", online: true,  DateTime.UtcNow.AddMinutes(-2));
        SeedDevice(102, "ws-alpha", "vm-pve-a1-2", online: false, DateTime.UtcNow.AddHours(-4));
        SeedDevice(200, "ws-beta",  "vm-pve-b1-0", online: true,  DateTime.UtcNow.AddMinutes(-1));
        SeedDevice(300, "ws-gamma", "vm-pve-g1-0", online: true,  DateTime.UtcNow.AddMinutes(-1));
    }

    private void SeedDevice(int vmid, string group, string name, bool online, DateTime lastSeen)
        => _inventory[vmid] = new MeshDevice($"mesh-n-{vmid}", group, name, online, "1.0-mock", lastSeen);

    /// <summary>
    /// Register a new Mesh device for a VM. Used by the enrollment reconciler to
    /// fake agent self-provisioning. Idempotent — repeat calls just refresh the
    /// last-seen timestamp.
    /// </summary>
    public void RegisterDevice(int vmid, string workspaceId, string name)
    {
        _inventory.AddOrUpdate(vmid,
            _ => new MeshDevice($"mesh-n-{vmid}", workspaceId, name, true, "1.0-mock", DateTime.UtcNow),
            (_, existing) => existing with { LastSeenUtc = DateTime.UtcNow, Online = true });
    }

    /// <inheritdoc />
    public Task<MeshDevice?> FindDeviceForVmAsync(int vmid, CancellationToken ct = default)
        => Task.FromResult(_inventory.TryGetValue(vmid, out var d) ? d : null);

    /// <inheritdoc />
    public Task<MeshSessionTicket> MintLoginTicketAsync(string nodeId, TimeSpan ttl, CancellationToken ct = default)
    {
        var device = _inventory.Values.FirstOrDefault(d => d.NodeId == nodeId)
            ?? throw new InvalidOperationException($"Unknown MeshCentral node: {nodeId}");

        var token = Guid.NewGuid().ToString("N");
        var expiresAt = DateTime.UtcNow.Add(ttl);
        _tickets[token] = (device, expiresAt);

        var baseUrl = _options.BaseUrl ?? "/mock-mesh";
        var url = $"{baseUrl.TrimEnd('/')}/session/{token}";
        return Task.FromResult(new MeshSessionTicket(url, token, expiresAt, nodeId));
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<MeshDevice>> ListDevicesAsync(CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<MeshDevice>>(_inventory.Values.ToArray());

    /// <inheritdoc />
    public bool TryRedeemTicket(string token, out MeshDevice? device)
    {
        device = null;
        if (!_tickets.TryGetValue(token, out var entry)) return false;
        if (DateTime.UtcNow > entry.ExpiresAtUtc)
        {
            _tickets.TryRemove(token, out _);
            return false;
        }
        device = entry.Device;
        return true;
    }
}
