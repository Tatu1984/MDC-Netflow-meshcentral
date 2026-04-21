using MDC.Core.Services.Providers.NetFlow.Dto;

namespace MDC.Core.Services.Providers.NetFlow;

/// <summary>
/// A single NetFlow collector — either the central in-process listener or a
/// remote edge collector accessed over its query API. Each collector owns a
/// subset of the fleet's flow records.
/// </summary>
public interface IFlowCollector
{
    /// <summary>Stable collector id (e.g. "central", "edge-beta").</summary>
    string Id { get; }

    /// <summary>Human-readable name for admin UI.</summary>
    string DisplayName { get; }

    /// <summary>Kind (e.g. "central", "edge").</summary>
    string Kind { get; }

    /// <summary>Workspaces whose flows this collector stores (used by the coordinator to decide where to fan out).</summary>
    IReadOnlyCollection<string> CoveredWorkspaces { get; }

    /// <summary>Records currently in this collector's store.</summary>
    Task<IReadOnlyList<FlowRecord>> SnapshotAsync(CancellationToken ct = default);

    /// <summary>Exporter inventory for this collector's store.</summary>
    Task<IReadOnlyList<FlowExporter>> ExportersAsync(CancellationToken ct = default);

    /// <summary>Quick health / reachability probe.</summary>
    Task<CollectorHealth> HealthAsync(CancellationToken ct = default);
}

/// <summary>Single-pass health summary for a collector.</summary>
/// <param name="Id">Collector id.</param>
/// <param name="Kind">"central" or "edge".</param>
/// <param name="DisplayName">Friendly name.</param>
/// <param name="Reachable">True if the collector responded.</param>
/// <param name="RecordCount">How many records are currently in the collector.</param>
/// <param name="LastSeenUtc">Most recent flow timestamp.</param>
/// <param name="CoveredWorkspaces">Workspaces this collector covers.</param>
public sealed record CollectorHealth(
    string Id,
    string Kind,
    string DisplayName,
    bool Reachable,
    int RecordCount,
    DateTime? LastSeenUtc,
    IReadOnlyCollection<string> CoveredWorkspaces);
