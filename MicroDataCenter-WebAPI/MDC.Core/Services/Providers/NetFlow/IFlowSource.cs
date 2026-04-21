using MDC.Core.Services.Providers.NetFlow.Dto;

namespace MDC.Core.Services.Providers.NetFlow;

/// <summary>Abstraction over the live flow store (mock today, listener / EF / edge-federation later).</summary>
public interface IFlowSource
{
    /// <summary>All flow records currently in scope for queries (last N minutes, sorted by TsUtc desc).</summary>
    Task<IReadOnlyList<FlowRecord>> SnapshotAsync(CancellationToken ct = default);

    /// <summary>All registered exporters.</summary>
    Task<IReadOnlyList<FlowExporter>> ListExportersAsync(CancellationToken ct = default);
}
