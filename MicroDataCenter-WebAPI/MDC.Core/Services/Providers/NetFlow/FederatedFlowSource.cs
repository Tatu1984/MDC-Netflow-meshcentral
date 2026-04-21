using MDC.Core.Services.Providers.NetFlow.Dto;
using Microsoft.Extensions.Logging;

namespace MDC.Core.Services.Providers.NetFlow;

/// <summary>
/// Coordinator that fans flow queries out to every registered collector
/// (central + edges), merges results, and surfaces per-collector health so
/// the UI can indicate "edge-beta unreachable — showing partial results".
/// </summary>
public sealed class FederatedFlowSource : IFlowSource
{
    private readonly IEnumerable<IFlowCollector> _collectors;
    private readonly ILogger<FederatedFlowSource> _logger;

    /// <summary>Construct with the full set of collectors.</summary>
    public FederatedFlowSource(IEnumerable<IFlowCollector> collectors, ILogger<FederatedFlowSource> logger)
    {
        _collectors = collectors;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<FlowRecord>> SnapshotAsync(CancellationToken ct = default)
    {
        var tasks = _collectors.Select(async c =>
        {
            try { return await c.SnapshotAsync(ct); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Collector {CollectorId} unreachable — results will be partial", c.Id);
                return Array.Empty<FlowRecord>() as IReadOnlyList<FlowRecord>;
            }
        }).ToArray();
        var results = await Task.WhenAll(tasks);
        return results.SelectMany(r => r).OrderByDescending(r => r.TsUtc).ToArray();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<FlowExporter>> ListExportersAsync(CancellationToken ct = default)
    {
        var tasks = _collectors.Select(async c =>
        {
            try { return await c.ExportersAsync(ct); }
            catch { return Array.Empty<FlowExporter>() as IReadOnlyList<FlowExporter>; }
        });
        var results = await Task.WhenAll(tasks);
        return results.SelectMany(r => r).ToArray();
    }

    /// <summary>Per-collector health so admin UI can show which sources are contributing.</summary>
    public async Task<IReadOnlyList<CollectorHealth>> HealthAsync(CancellationToken ct = default)
    {
        var tasks = _collectors.Select(async c =>
        {
            try { return await c.HealthAsync(ct); }
            catch
            {
                return new CollectorHealth(c.Id, c.Kind, c.DisplayName, false, 0, null, c.CoveredWorkspaces);
            }
        });
        return await Task.WhenAll(tasks);
    }
}
