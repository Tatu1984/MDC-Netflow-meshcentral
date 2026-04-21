using System.Text.Json;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;
using MDC.Core.Services.Providers.PVEClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager;

/// <summary>
/// Live <see cref="IPdmClient"/> backed by the real Proxmox clusters that MDC
/// already knows about in its database. Each <c>DbSite</c> is projected as a
/// <see cref="PdmCluster"/>; node / VM / storage / event data is pulled from
/// each cluster's <see cref="IPVEClientService"/> on demand.
///
/// This implementation is selected when <c>Pdm:UseMock=false</c>.
/// It runs unchanged whether a real PDM is in front of PVE or not — the MDC
/// backend is already talking straight to PVE via <see cref="IMDCEndpointService"/>.
/// </summary>
internal sealed class PveBackedPdmClient : IPdmClient
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PveBackedPdmClient> _logger;

    public PveBackedPdmClient(IServiceScopeFactory scopeFactory, ILogger<PveBackedPdmClient> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    // ---------------------------------------------------------------
    //  Clusters
    // ---------------------------------------------------------------

    public async Task<IReadOnlyList<PdmCluster>> ListClustersAsync(CancellationToken ct = default)
    {
        var result = new List<PdmCluster>();
        await foreach (var (site, pve) in EnumerateSiteClientsAsync(ct))
        {
            try
            {
                var clusterStatus = await pve.GetClusterStatusAsync(ct);
                var resources = (await pve.GetClusterResourcesAsync(ct)).ToList();

                var nodes = resources.Where(r => r.Type == PVEResourceType.Node).ToList();
                var vms = resources.Where(r => r.Type == PVEResourceType.Qemu).ToList();
                var clusterEntry = clusterStatus.FirstOrDefault(s => s.Type == PVEClusterStatusType.Cluster);
                var quorum = clusterEntry?.Local == 1 || clusterStatus.Any(s => s.Type == PVEClusterStatusType.Cluster)
                    ? "quorate"
                    : "degraded";

                double cpuPct = nodes.Count == 0 ? 0 :
                    nodes.Select(n => (n.Cpu ?? 0d) * 100d).Average();
                double memPct = ComputeMemPct(nodes.Sum(n => n.Mem ?? 0), nodes.Sum(n => n.MaxMem ?? 0));

                result.Add(new PdmCluster(
                    Id: site.Id.ToString(),
                    Name: site.Name,
                    QuorumState: quorum,
                    NodeCount: nodes.Count,
                    VmCount: vms.Count,
                    CpuUsedPct: Math.Round(cpuPct, 1),
                    MemUsedPct: Math.Round(memPct, 1)));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Skipping site {SiteId} ({SiteName}) in ListClustersAsync", site.Id, site.Name);
            }
        }
        return result;
    }

    public async Task<IReadOnlyList<PdmNode>> ListNodesAsync(string clusterId, CancellationToken ct = default)
    {
        if (!Guid.TryParse(clusterId, out var siteId)) return Array.Empty<PdmNode>();
        var (site, pve) = await GetClusterClientAsync(siteId, ct) ?? default;
        if (pve is null) return Array.Empty<PdmNode>();

        var resources = (await pve.GetClusterResourcesAsync(ct)).Where(r => r.Type == PVEResourceType.Node).ToList();
        var qemu = (await pve.GetClusterResourcesAsync(ct)).Where(r => r.Type == PVEResourceType.Qemu).ToList();
        var vmsByNode = qemu.GroupBy(q => q.Node).ToDictionary(g => g.Key ?? "", g => g.Count());

        return resources.Select(n => new PdmNode(
            Id: n.Node ?? n.Name ?? n.Id,
            ClusterId: clusterId,
            Name: n.Node ?? n.Name ?? n.Id,
            Status: n.Status ?? (n.Cpu.HasValue ? "online" : "unknown"),
            VmCount: vmsByNode.TryGetValue(n.Node ?? "", out var c) ? c : 0,
            CpuPct: Math.Round((n.Cpu ?? 0d) * 100d, 1),
            MemPct: Math.Round(ComputeMemPct(n.Mem ?? 0, n.MaxMem ?? 0), 1),
            UptimeSec: n.Uptime ?? 0)).ToArray();
    }

    public async Task<IReadOnlyList<PdmVm>> ListVmsAsync(string clusterId, CancellationToken ct = default)
    {
        if (!Guid.TryParse(clusterId, out var siteId)) return Array.Empty<PdmVm>();
        var (site, pve) = await GetClusterClientAsync(siteId, ct) ?? default;
        if (pve is null) return Array.Empty<PdmVm>();

        var resources = await pve.GetClusterResourcesAsync(ct);
        return resources
            .Where(r => r.Type == PVEResourceType.Qemu && r.VmId.HasValue)
            .Select(r => new PdmVm(
                Vmid: r.VmId!.Value,
                NodeId: r.Node ?? "",
                ClusterId: clusterId,
                Name: r.Name ?? $"vm-{r.VmId}",
                Status: r.Status ?? "unknown"))
            .ToArray();
    }

    // ---------------------------------------------------------------
    //  Per-VM / per-node metrics
    // ---------------------------------------------------------------

    public async Task<PdmMetricsSample> GetVmMetricsAsync(string clusterId, int vmid, CancellationToken ct = default)
    {
        if (!Guid.TryParse(clusterId, out var siteId)) return Empty();
        var (site, pve) = await GetClusterClientAsync(siteId, ct) ?? default;
        if (pve is null) return Empty();

        var resources = await pve.GetClusterResourcesAsync(ct);
        var vm = resources.FirstOrDefault(r => r.Type == PVEResourceType.Qemu && r.VmId == vmid);
        if (vm?.Node is null) return Empty();

        try
        {
            var status = await pve.GetQemuStatusCurrentAsync(vm.Node, vmid, ct);
            return ToSampleFromQemuStatus(status, vm);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch VM status for vmid {Vmid} on node {Node}", vmid, vm.Node);
            return new PdmMetricsSample(DateTime.UtcNow,
                Math.Round((vm.Cpu ?? 0) * 100, 1),
                Math.Round(ComputeMemPct(vm.Mem ?? 0, vm.MaxMem ?? 0), 1),
                0, 0, 0, 0);
        }
    }

    public async Task<PdmMetricsSample> GetNodeMetricsAsync(string nodeId, CancellationToken ct = default)
    {
        await foreach (var (site, pve) in EnumerateSiteClientsAsync(ct))
        {
            try
            {
                var s = await pve.GetNodeStatusAsync(nodeId, ct);
                return new PdmMetricsSample(
                    TsUtc: DateTime.UtcNow,
                    CpuPct: Math.Round((double)s.CPU * 100d, 1),
                    MemPct: Math.Round(ComputeMemPct(s.Memory.Used, s.Memory.Total), 1),
                    DiskReadBps: 0, DiskWriteBps: 0, NetRxBps: 0, NetTxBps: 0);
            }
            catch
            {
                // node not in this cluster, try next
            }
        }
        return Empty();
    }

    // ---------------------------------------------------------------
    //  Events & storage
    // ---------------------------------------------------------------

    public async Task<IReadOnlyList<PdmEvent>> GetRecentEventsAsync(int take, CancellationToken ct = default)
    {
        var all = new List<PdmEvent>();
        await foreach (var (site, pve) in EnumerateSiteClientsAsync(ct))
        {
            try
            {
                var tasks = await pve.GetTasksAsync(ct);
                foreach (var t in tasks)
                {
                    var ts = t.StartTime.HasValue ? DateTimeOffset.FromUnixTimeSeconds(t.StartTime.Value).UtcDateTime : DateTime.UtcNow;
                    all.Add(new PdmEvent(ts, site.Id.ToString(), t.Node, t.Type ?? "task", $"{t.User ?? "?"}: {t.Id ?? t.UPID} [{t.Status ?? "?"}]"));
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read tasks for site {SiteId}", site.Id);
            }
        }
        return all.OrderByDescending(e => e.TsUtc).Take(take).ToArray();
    }

    public async Task<IReadOnlyList<PdmStoragePool>> ListStoragePoolsAsync(CancellationToken ct = default)
    {
        var pools = new List<PdmStoragePool>();
        await foreach (var (site, pve) in EnumerateSiteClientsAsync(ct))
        {
            try
            {
                var resources = await pve.GetClusterResourcesAsync(ct);
                foreach (var r in resources.Where(r => r.Type == PVEResourceType.Storage))
                {
                    pools.Add(new PdmStoragePool(
                        Id: r.Id,
                        ClusterId: site.Id.ToString(),
                        Name: r.Name ?? r.Id,
                        Kind: r.PluginType ?? r.Content ?? "unknown",
                        Health: r.Status ?? "unknown",
                        TotalBytes: r.MaxDisk ?? 0,
                        UsedBytes: r.Disk ?? 0));
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to list storage for site {SiteId}", site.Id);
            }
        }
        return pools;
    }

    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        await foreach (var (_, pve) in EnumerateSiteClientsAsync(ct))
        {
            try
            {
                await pve.GetClusterStatusAsync(ct);
                return true;
            }
            catch
            {
                // try next site
            }
        }
        return false;
    }

    // ---------------------------------------------------------------
    //  Helpers
    // ---------------------------------------------------------------

    private async IAsyncEnumerable<(DbSite Site, IPVEClientService Pve)> EnumerateSiteClientsAsync(
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var endpointService = scope.ServiceProvider.GetRequiredService<IMDCEndpointService>();
        var factory = scope.ServiceProvider.GetRequiredService<IPVEClientFactory>();

        List<DbSite> sites;
        try
        {
            sites = await db.Sites.IgnoreQueryFilters().AsNoTracking().ToListAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MDC database unavailable — no live sites will be returned. Check 'DefaultConnection'.");
            yield break;
        }

        foreach (var site in sites)
        {
            MicroDataCenterEndpoint[] eps;
            try
            {
                eps = await endpointService.GetMicroDataCenterEndpointsAsync(site.Id, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not resolve endpoints for site {SiteId}", site.Id);
                continue;
            }
            if (eps.Length == 0) continue;

            IPVEClientService pve;
            try
            {
                pve = factory.Create(eps[0]);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not build PVE client for site {SiteId}", site.Id);
                continue;
            }
            yield return (site, pve);
        }
    }

    private async Task<(DbSite Site, IPVEClientService Pve)?> GetClusterClientAsync(Guid siteId, CancellationToken ct)
    {
        await foreach (var pair in EnumerateSiteClientsAsync(ct))
        {
            if (pair.Site.Id == siteId) return pair;
        }
        return null;
    }

    private static PdmMetricsSample Empty() => new(DateTime.UtcNow, 0, 0, 0, 0, 0, 0);

    private static double ComputeMemPct(long used, long total) =>
        total <= 0 ? 0 : (double)used / total * 100.0;

    private static PdmMetricsSample ToSampleFromQemuStatus(PVEQemuStatus status, PVEResource vm)
    {
        // PVEQemuStatus captures extra fields in UnknownProperties — pull live
        // counters from there when present; otherwise fall back to the snapshot
        // in the cluster-resources row.
        double cpuPct = TryDouble(status.UnknownProperties, "cpu", out var c) ? c * 100d :
                        (vm.Cpu ?? 0) * 100d;
        double memPct;
        if (TryLong(status.UnknownProperties, "mem", out var mem) &&
            TryLong(status.UnknownProperties, "maxmem", out var maxmem))
        {
            memPct = ComputeMemPct(mem, maxmem);
        }
        else
        {
            memPct = ComputeMemPct(vm.Mem ?? 0, vm.MaxMem ?? 0);
        }
        TryLong(status.UnknownProperties, "diskread", out var dr);
        TryLong(status.UnknownProperties, "diskwrite", out var dw);
        TryLong(status.UnknownProperties, "netin", out var netin);
        TryLong(status.UnknownProperties, "netout", out var netout);

        return new PdmMetricsSample(
            TsUtc: DateTime.UtcNow,
            CpuPct: Math.Round(cpuPct, 1),
            MemPct: Math.Round(memPct, 1),
            DiskReadBps: dr,
            DiskWriteBps: dw,
            NetRxBps: netin,
            NetTxBps: netout);
    }

    private static bool TryDouble(IDictionary<string, JsonElement> bag, string key, out double value)
    {
        value = 0;
        return bag.TryGetValue(key, out var el) && el.TryGetDouble(out value);
    }

    private static bool TryLong(IDictionary<string, JsonElement> bag, string key, out long value)
    {
        value = 0;
        return bag.TryGetValue(key, out var el) && el.TryGetInt64(out value);
    }
}
