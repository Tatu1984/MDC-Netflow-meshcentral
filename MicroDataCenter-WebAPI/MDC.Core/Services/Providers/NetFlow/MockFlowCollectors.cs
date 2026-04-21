using MDC.Core.Services.Providers.NetFlow.Dto;

namespace MDC.Core.Services.Providers.NetFlow;

/// <summary>Generator helpers used to seed mock collectors with distinct flow subsets.</summary>
internal static class MockFlowFixtures
{
    public static IEnumerable<FlowRecord> GenerateWorkspace(
        Random rng, DateTime now, string wsId, string clusterShortName, string exporterId,
        int startVmid, int vmCount, int countPerVm)
    {
        var protocols = new (byte proto, int port)[] { (6, 443), (6, 80), (6, 22), (17, 53), (17, 123) };
        for (var v = 0; v < vmCount; v++)
        {
            var vmid = startVmid + v;
            var srcIp = $"10.0.{10 + (vmid / 100 - 1) * 10}.{(vmid % 100) + 10}";
            var nic = $"{clusterShortName}/vm-{vmid}/net0";
            for (var i = 0; i < countPerVm; i++)
            {
                var (proto, port) = protocols[rng.Next(protocols.Length)];
                var bytes = (long)rng.Next(1_000, 5_000_000);
                yield return new FlowRecord(
                    TsUtc: now.AddSeconds(-rng.Next(0, 300)),
                    ExporterId: exporterId,
                    ObservationPoint: nic,
                    SrcIp: srcIp,
                    SrcPort: rng.Next(32768, 61000),
                    DstIp: $"198.51.100.{rng.Next(1, 254)}",
                    DstPort: port,
                    Protocol: proto,
                    Bytes: bytes,
                    Packets: bytes / 1000,
                    VmId: vmid,
                    WorkspaceId: wsId,
                    IsPhysicalInterface: false);
            }
        }
    }

    public static IEnumerable<FlowRecord> GeneratePhysical(
        Random rng, DateTime now, string observationPoint, string exporterId, int count)
    {
        for (var i = 0; i < count; i++)
        {
            var bytes = (long)rng.Next(10_000_000, 500_000_000);
            yield return new FlowRecord(
                TsUtc: now.AddSeconds(-rng.Next(0, 300)),
                ExporterId: exporterId,
                ObservationPoint: observationPoint,
                SrcIp: $"10.0.{rng.Next(10, 40)}.{rng.Next(1, 254)}",
                SrcPort: rng.Next(32768, 61000),
                DstIp: $"93.184.{rng.Next(0, 255)}.{rng.Next(1, 254)}",
                DstPort: 443,
                Protocol: 6,
                Bytes: bytes,
                Packets: bytes / 1400,
                VmId: null,
                WorkspaceId: null,
                IsPhysicalInterface: true);
        }
    }
}

/// <summary>
/// Central in-process collector — represents the thin-slice NetFlow listener
/// that the backend runs directly. Owns ws-alpha flows + physical uplink flows.
/// Timestamps are re-stamped on every snapshot so records always fall within
/// the default 5-minute query window regardless of backend uptime.
/// </summary>
public sealed class CentralMockFlowCollector : IFlowCollector
{
    private IReadOnlyList<FlowRecord> Regenerate()
    {
        var rng = new Random(1337);
        var now = DateTime.UtcNow;
        var list = new List<FlowRecord>();
        list.AddRange(MockFlowFixtures.GenerateWorkspace(rng, now, "ws-alpha", "alpha", "exp-alpha-vsw", startVmid: 100, vmCount: 5, countPerVm: 8));
        list.AddRange(MockFlowFixtures.GeneratePhysical(rng, now, "alpha/pve-a1/uplink-0", "exp-alpha-tor", 12));
        list.AddRange(MockFlowFixtures.GeneratePhysical(rng, now, "alpha/pve-a2/uplink-0", "exp-alpha-tor", 8));
        return list.OrderByDescending(r => r.TsUtc).ToArray();
    }

    /// <inheritdoc />
    public string Id => "central";
    /// <inheritdoc />
    public string DisplayName => "Central (MDC backend)";
    /// <inheritdoc />
    public string Kind => "central";
    /// <inheritdoc />
    public IReadOnlyCollection<string> CoveredWorkspaces { get; } = new[] { "ws-alpha" };

    /// <inheritdoc />
    public Task<IReadOnlyList<FlowRecord>> SnapshotAsync(CancellationToken ct = default)
        => Task.FromResult(Regenerate());

    /// <inheritdoc />
    public Task<IReadOnlyList<FlowExporter>> ExportersAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        IReadOnlyList<FlowExporter> exporters = new[]
        {
            new FlowExporter("exp-alpha-vsw", "Alpha vSwitch", "10.0.10.1", "central", now, true),
            new FlowExporter("exp-alpha-tor", "Alpha ToR",     "10.0.10.254","central", now, true),
        };
        return Task.FromResult(exporters);
    }

    /// <inheritdoc />
    public Task<CollectorHealth> HealthAsync(CancellationToken ct = default)
    {
        var snap = Regenerate();
        return Task.FromResult(new CollectorHealth(Id, Kind, DisplayName, true, snap.Count,
            snap.FirstOrDefault()?.TsUtc, CoveredWorkspaces));
    }
}

/// <summary>
/// Edge collector — simulates an edge device at a site holding only that
/// site's flows in its local store. The central coordinator queries it over
/// the EdgeCollectorQueryApi (in production; in-process here). Records are
/// re-stamped on every snapshot so they always fall inside the query window.
/// </summary>
public sealed class EdgeMockFlowCollector : IFlowCollector
{
    private readonly string _workspaceId;
    private readonly string _exporterId;
    private readonly int _startVmid;
    private readonly int _vmCount;
    private readonly string _clusterShortName;
    private readonly int _rngSeed;
    private readonly Func<bool> _reachable;

    /// <summary>Construct with collector id, covered workspace, exporter, and VM range.</summary>
    public EdgeMockFlowCollector(string id, string displayName, string workspaceId, string exporterId,
        int startVmid, int vmCount, string clusterShortName, Func<bool>? reachable = null)
    {
        Id = id;
        DisplayName = displayName;
        CoveredWorkspaces = new[] { workspaceId };
        _workspaceId = workspaceId;
        _exporterId = exporterId;
        _startVmid = startVmid;
        _vmCount = vmCount;
        _clusterShortName = clusterShortName;
        _rngSeed = id.GetHashCode();
        _reachable = reachable ?? (() => true);
    }

    private IReadOnlyList<FlowRecord> Regenerate()
    {
        var rng = new Random(_rngSeed);
        var now = DateTime.UtcNow;
        return MockFlowFixtures
            .GenerateWorkspace(rng, now, _workspaceId, _clusterShortName, _exporterId, _startVmid, _vmCount, 8)
            .OrderByDescending(r => r.TsUtc)
            .ToArray();
    }

    /// <inheritdoc />
    public string Id { get; }
    /// <inheritdoc />
    public string DisplayName { get; }
    /// <inheritdoc />
    public string Kind => "edge";
    /// <inheritdoc />
    public IReadOnlyCollection<string> CoveredWorkspaces { get; }

    /// <inheritdoc />
    public Task<IReadOnlyList<FlowRecord>> SnapshotAsync(CancellationToken ct = default)
    {
        if (!_reachable()) throw new InvalidOperationException($"Edge collector {Id} unreachable");
        return Task.FromResult(Regenerate());
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<FlowExporter>> ExportersAsync(CancellationToken ct = default)
    {
        if (!_reachable()) return Task.FromResult<IReadOnlyList<FlowExporter>>(Array.Empty<FlowExporter>());
        var now = DateTime.UtcNow;
        IReadOnlyList<FlowExporter> list = new[]
        {
            new FlowExporter(_exporterId, DisplayName + " vSwitch", "10.0.20.1", Id, now.AddMinutes(-1), true),
        };
        return Task.FromResult(list);
    }

    /// <inheritdoc />
    public Task<CollectorHealth> HealthAsync(CancellationToken ct = default)
    {
        var reachable = _reachable();
        var snap = reachable ? Regenerate() : Array.Empty<FlowRecord>();
        return Task.FromResult(new CollectorHealth(Id, Kind, DisplayName, reachable,
            snap.Count,
            snap.FirstOrDefault()?.TsUtc,
            CoveredWorkspaces));
    }
}
