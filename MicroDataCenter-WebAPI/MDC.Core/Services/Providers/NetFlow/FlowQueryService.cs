using System.Security.Claims;
using MDC.Core.Services.Providers.NetFlow.Dto;
using MDC.Core.Services.Security;

namespace MDC.Core.Services.Providers.NetFlow;

/// <summary>
/// Tier-aware NetFlow query service. Rewrites every non-admin query to the
/// caller's workspace memberships and strips physical-interface records.
/// Admin queries run unscoped.
/// </summary>
public sealed class FlowQueryService
{
    private readonly IFlowSource _source;
    private readonly ITierResolver _tier;

    /// <summary>Construct with flow source + tier resolver.</summary>
    public FlowQueryService(IFlowSource source, ITierResolver tier)
    {
        _source = source;
        _tier = tier;
    }

    /// <summary>Describes a user query — what to filter on.</summary>
    /// <param name="WorkspaceId">Optional workspace filter (merged with tier scope).</param>
    /// <param name="VmId">Optional VM filter.</param>
    /// <param name="ObservationPoint">Optional interface filter.</param>
    /// <param name="IncludePhysical">Caller's preference; ignored for non-admins (always stripped).</param>
    /// <param name="WindowSeconds">How far back to look.</param>
    /// <param name="Take">Page size.</param>
    public sealed record FlowQuery(
        string? WorkspaceId = null,
        int? VmId = null,
        string? ObservationPoint = null,
        bool IncludePhysical = false,
        int WindowSeconds = 300,
        int Take = 100);

    /// <summary>Run a tier-scoped flow query for the given caller.</summary>
    public async Task<FlowResult> QueryAsync(ClaimsPrincipal user, FlowQuery q, CancellationToken ct = default)
    {
        var tier = await _tier.ResolveAsync(user, ct);
        var all = await _source.SnapshotAsync(ct);
        var cutoff = DateTime.UtcNow.AddSeconds(-Math.Max(1, q.WindowSeconds));

        IEnumerable<FlowRecord> filtered = all.Where(r => r.TsUtc >= cutoff);

        if (tier.Kind == TierKind.WorkspaceMember)
        {
            filtered = filtered
                .Where(r => r.WorkspaceId != null && tier.WorkspaceIds.Contains(r.WorkspaceId, StringComparer.OrdinalIgnoreCase))
                .Where(r => !r.IsPhysicalInterface);
        }
        else if (!q.IncludePhysical)
        {
            filtered = filtered.Where(r => !r.IsPhysicalInterface);
        }

        if (!string.IsNullOrEmpty(q.WorkspaceId))
        {
            if (tier.Kind == TierKind.WorkspaceMember &&
                !tier.WorkspaceIds.Contains(q.WorkspaceId, StringComparer.OrdinalIgnoreCase))
            {
                return new FlowResult(tier.Kind.ToString(), Array.Empty<FlowRecord>(), 0);
            }
            filtered = filtered.Where(r => string.Equals(r.WorkspaceId, q.WorkspaceId, StringComparison.OrdinalIgnoreCase));
        }
        if (q.VmId.HasValue) filtered = filtered.Where(r => r.VmId == q.VmId.Value);
        if (!string.IsNullOrEmpty(q.ObservationPoint))
        {
            filtered = filtered.Where(r => string.Equals(r.ObservationPoint, q.ObservationPoint, StringComparison.OrdinalIgnoreCase));
        }

        var materialized = filtered.ToList();
        var page = materialized.OrderByDescending(r => r.TsUtc).Take(Math.Max(1, q.Take)).ToArray();
        return new FlowResult(tier.Kind.ToString(), page, materialized.Count);
    }

    /// <summary>Top-N talkers grouped by observation point within the tier scope.</summary>
    public async Task<IReadOnlyList<TopTalker>> TopTalkersAsync(ClaimsPrincipal user, FlowQuery q, int n = 10, CancellationToken ct = default)
    {
        var result = await QueryAsync(user, q with { Take = int.MaxValue }, ct);
        return result.Records
            .GroupBy(r => r.ObservationPoint)
            .Select(g => new TopTalker(
                Key: g.Key,
                Label: g.Key,
                Bytes: g.Sum(r => r.Bytes),
                Packets: g.Sum(r => r.Packets),
                FlowCount: g.Count()))
            .OrderByDescending(t => t.Bytes)
            .Take(n)
            .ToArray();
    }

    /// <summary>Virtual interfaces visible to the caller for a given workspace.</summary>
    public async Task<IReadOnlyList<WorkspaceInterface>> WorkspaceInterfacesAsync(ClaimsPrincipal user, string workspaceId, CancellationToken ct = default)
    {
        var result = await QueryAsync(user, new FlowQuery(WorkspaceId: workspaceId, Take: int.MaxValue), ct);
        return result.Records
            .Where(r => r.VmId.HasValue)
            .GroupBy(r => (r.ObservationPoint, r.VmId!.Value))
            .Select(g => new WorkspaceInterface(
                Id: g.Key.ObservationPoint,
                WorkspaceId: workspaceId,
                VmId: g.Key.Value,
                VmName: $"vm-{g.Key.Value}",
                Name: g.Key.ObservationPoint.Split('/').Last(),
                RxBytes: g.Sum(r => r.Bytes / 2),
                TxBytes: g.Sum(r => r.Bytes / 2),
                FlowCount: g.Count()))
            .OrderBy(w => w.VmId).ThenBy(w => w.Name)
            .ToArray();
    }
}

/// <summary>Tier-aware flow query result.</summary>
/// <param name="Tier">Tier the caller was resolved into.</param>
/// <param name="Records">Page of records for this query.</param>
/// <param name="TotalAfterFilter">Count of records that matched before paging.</param>
public sealed record FlowResult(string Tier, IReadOnlyList<FlowRecord> Records, int TotalAfterFilter);
