using MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;

namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager;

/// <summary>
/// Deterministic in-process fake for local development. Not a production client.
/// Returns a small fixed fleet so frontends have non-empty data to render without a real PDM.
/// </summary>
public sealed class MockPdmClient : IPdmClient
{
    private static readonly IReadOnlyList<PdmCluster> Clusters = new[]
    {
        new PdmCluster("cluster-alpha", "Alpha (HQ)",    QuorumState: "quorate", NodeCount: 3, VmCount: 14, CpuUsedPct: 42.1, MemUsedPct: 61.7),
        new PdmCluster("cluster-beta",  "Beta (Edge 1)", QuorumState: "quorate", NodeCount: 2, VmCount:  6, CpuUsedPct: 18.0, MemUsedPct: 33.4),
        new PdmCluster("cluster-gamma", "Gamma (Edge 2)",QuorumState: "degraded",NodeCount: 2, VmCount:  4, CpuUsedPct: 76.9, MemUsedPct: 58.2),
    };

    private static readonly IReadOnlyDictionary<string, IReadOnlyList<PdmNode>> Nodes = new Dictionary<string, IReadOnlyList<PdmNode>>
    {
        ["cluster-alpha"] = new[]
        {
            new PdmNode("pve-a1", "cluster-alpha", "pve-a1", "online", 6, 38.2, 55.1, 1234567),
            new PdmNode("pve-a2", "cluster-alpha", "pve-a2", "online", 5, 41.5, 62.9, 1230000),
            new PdmNode("pve-a3", "cluster-alpha", "pve-a3", "online", 3, 46.7, 67.0, 1100000),
        },
        ["cluster-beta"] = new[]
        {
            new PdmNode("pve-b1", "cluster-beta", "pve-b1", "online", 4, 22.1, 38.0, 700000),
            new PdmNode("pve-b2", "cluster-beta", "pve-b2", "online", 2, 13.9, 28.8, 690000),
        },
        ["cluster-gamma"] = new[]
        {
            new PdmNode("pve-g1", "cluster-gamma", "pve-g1", "online",  3, 79.0, 60.4, 400000),
            new PdmNode("pve-g2", "cluster-gamma", "pve-g2", "offline", 1,  0.0,  0.0, 0),
        },
    };

    /// <inheritdoc />
    public Task<IReadOnlyList<PdmCluster>> ListClustersAsync(CancellationToken ct = default)
        => Task.FromResult(Clusters);

    /// <inheritdoc />
    public Task<IReadOnlyList<PdmNode>> ListNodesAsync(string clusterId, CancellationToken ct = default)
        => Task.FromResult(Nodes.TryGetValue(clusterId, out var n) ? n : Array.Empty<PdmNode>());

    private static readonly IReadOnlyDictionary<string, int> ClusterVmidBase = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
    {
        ["cluster-alpha"] = 100,
        ["cluster-beta"]  = 200,
        ["cluster-gamma"] = 300,
    };

    /// <inheritdoc />
    public Task<IReadOnlyList<PdmVm>> ListVmsAsync(string clusterId, CancellationToken ct = default)
    {
        var vms = new List<PdmVm>();
        if (Nodes.TryGetValue(clusterId, out var nodes))
        {
            // Distinct VMID ranges per cluster so global lookups by VMID are unambiguous.
            var vmid = ClusterVmidBase.TryGetValue(clusterId, out var baseId) ? baseId : 100;
            foreach (var node in nodes)
            {
                for (var i = 0; i < node.VmCount; i++)
                {
                    vms.Add(new PdmVm(vmid++, node.Id, clusterId, $"vm-{node.Name}-{i}", i % 5 == 0 ? "stopped" : "running"));
                }
            }
        }
        return Task.FromResult<IReadOnlyList<PdmVm>>(vms);
    }

    /// <inheritdoc />
    public Task<PdmMetricsSample> GetVmMetricsAsync(string clusterId, int vmid, CancellationToken ct = default)
    {
        var seed = vmid + clusterId.GetHashCode();
        var rng = new Random(seed);
        return Task.FromResult(new PdmMetricsSample(
            TsUtc: DateTime.UtcNow,
            CpuPct: Math.Round(rng.NextDouble() * 100, 1),
            MemPct: Math.Round(rng.NextDouble() * 100, 1),
            DiskReadBps:  rng.NextInt64(0, 50_000_000),
            DiskWriteBps: rng.NextInt64(0, 20_000_000),
            NetRxBps:     rng.NextInt64(0, 100_000_000),
            NetTxBps:     rng.NextInt64(0,  50_000_000)));
    }

    /// <inheritdoc />
    public Task<PdmMetricsSample> GetNodeMetricsAsync(string nodeId, CancellationToken ct = default)
    {
        var rng = new Random(nodeId.GetHashCode());
        return Task.FromResult(new PdmMetricsSample(
            TsUtc: DateTime.UtcNow,
            CpuPct: Math.Round(rng.NextDouble() * 100, 1),
            MemPct: Math.Round(rng.NextDouble() * 100, 1),
            DiskReadBps:  rng.NextInt64(0, 200_000_000),
            DiskWriteBps: rng.NextInt64(0, 100_000_000),
            NetRxBps:     rng.NextInt64(0, 500_000_000),
            NetTxBps:     rng.NextInt64(0, 300_000_000)));
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<PdmEvent>> GetRecentEventsAsync(int take, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        IReadOnlyList<PdmEvent> events = new[]
        {
            new PdmEvent(now.AddMinutes(-2),  "cluster-gamma", "pve-g2", "node.offline", "Node pve-g2 went offline"),
            new PdmEvent(now.AddMinutes(-8),  "cluster-alpha", "pve-a1", "vm.started",   "VM 101 started by user alice"),
            new PdmEvent(now.AddMinutes(-12), "cluster-beta",  "pve-b1", "migration",    "VM 204 migrated from pve-b2 to pve-b1"),
            new PdmEvent(now.AddHours(-1),    "cluster-alpha", null,     "quorum.ok",    "Cluster quorum restored"),
        };
        return Task.FromResult<IReadOnlyList<PdmEvent>>(events.Take(take).ToArray());
    }

    /// <inheritdoc />
    public Task<bool> PingAsync(CancellationToken ct = default) => Task.FromResult(true);

    private static readonly IReadOnlyList<PdmStoragePool> Pools = new[]
    {
        new PdmStoragePool("local-lvm-a",  "cluster-alpha", "local-lvm",     "lvm-thin", "healthy",  TotalBytes: 2_000_000_000_000L, UsedBytes: 1_200_000_000_000L),
        new PdmStoragePool("ceph-a",       "cluster-alpha", "ceph-primary",  "ceph",     "healthy",  TotalBytes: 12_000_000_000_000L, UsedBytes: 6_400_000_000_000L),
        new PdmStoragePool("local-lvm-b",  "cluster-beta",  "local-lvm",     "lvm-thin", "healthy",  TotalBytes: 1_000_000_000_000L, UsedBytes: 280_000_000_000L),
        new PdmStoragePool("nfs-b",        "cluster-beta",  "nfs-backup",    "nfs",      "healthy",  TotalBytes: 8_000_000_000_000L, UsedBytes: 3_100_000_000_000L),
        new PdmStoragePool("ceph-g",       "cluster-gamma", "ceph-primary",  "ceph",     "degraded", TotalBytes: 6_000_000_000_000L, UsedBytes: 5_400_000_000_000L),
    };

    /// <inheritdoc />
    public Task<IReadOnlyList<PdmStoragePool>> ListStoragePoolsAsync(CancellationToken ct = default)
        => Task.FromResult(Pools);
}
