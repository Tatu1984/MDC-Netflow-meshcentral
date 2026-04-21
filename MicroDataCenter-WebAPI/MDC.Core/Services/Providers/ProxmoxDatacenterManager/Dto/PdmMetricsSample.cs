namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;

/// <summary>A single point-in-time utilisation sample for a node or VM.</summary>
/// <param name="TsUtc">UTC timestamp of the sample.</param>
/// <param name="CpuPct">CPU utilisation percentage.</param>
/// <param name="MemPct">Memory utilisation percentage.</param>
/// <param name="DiskReadBps">Disk read throughput in bytes per second.</param>
/// <param name="DiskWriteBps">Disk write throughput in bytes per second.</param>
/// <param name="NetRxBps">Network receive throughput in bytes per second.</param>
/// <param name="NetTxBps">Network transmit throughput in bytes per second.</param>
public sealed record PdmMetricsSample(
    DateTime TsUtc,
    double CpuPct,
    double MemPct,
    long DiskReadBps,
    long DiskWriteBps,
    long NetRxBps,
    long NetTxBps);
