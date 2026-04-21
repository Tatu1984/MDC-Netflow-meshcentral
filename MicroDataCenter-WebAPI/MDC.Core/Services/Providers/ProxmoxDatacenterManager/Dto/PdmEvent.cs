namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;

/// <summary>A PDM audit or task event.</summary>
/// <param name="TsUtc">UTC timestamp the event was recorded.</param>
/// <param name="ClusterId">Cluster the event relates to.</param>
/// <param name="NodeId">Node the event relates to, if any.</param>
/// <param name="Kind">Event kind (e.g. "vm.started", "node.offline").</param>
/// <param name="Message">Human-readable description.</param>
public sealed record PdmEvent(
    DateTime TsUtc,
    string ClusterId,
    string? NodeId,
    string Kind,
    string Message);
