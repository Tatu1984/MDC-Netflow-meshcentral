namespace MDC.Core.Services.Providers.NetFlow.Dto;

/// <summary>A single normalized NetFlow record after enrichment.</summary>
/// <param name="TsUtc">When the flow was observed.</param>
/// <param name="ExporterId">The NetFlow exporter (router / switch / vSwitch) that emitted the record.</param>
/// <param name="ObservationPoint">Interface identifier on the exporter (e.g. "alpha/vm-100/net0" or "alpha/pve-a1/uplink-0").</param>
/// <param name="SrcIp">Source IP.</param>
/// <param name="SrcPort">Source port.</param>
/// <param name="DstIp">Destination IP.</param>
/// <param name="DstPort">Destination port.</param>
/// <param name="Protocol">IP protocol number (6=TCP, 17=UDP, 1=ICMP).</param>
/// <param name="Bytes">Total bytes in the flow.</param>
/// <param name="Packets">Total packets in the flow.</param>
/// <param name="VmId">MDC VM id resolved from src or dst IP (null if no match).</param>
/// <param name="WorkspaceId">MDC workspace id resolved from VmId (null if no match).</param>
/// <param name="IsPhysicalInterface">True when the observation point is a physical NIC (admin-only visibility).</param>
public sealed record FlowRecord(
    DateTime TsUtc,
    string ExporterId,
    string ObservationPoint,
    string SrcIp,
    int SrcPort,
    string DstIp,
    int DstPort,
    byte Protocol,
    long Bytes,
    long Packets,
    int? VmId,
    string? WorkspaceId,
    bool IsPhysicalInterface);

/// <summary>Top-talker aggregate over a window.</summary>
/// <param name="Key">The grouping key (IP, interface, VMID, etc.).</param>
/// <param name="Label">Human-readable label.</param>
/// <param name="Bytes">Total bytes.</param>
/// <param name="Packets">Total packets.</param>
/// <param name="FlowCount">Number of flows that contributed.</param>
public sealed record TopTalker(string Key, string Label, long Bytes, long Packets, long FlowCount);

/// <summary>A registered exporter.</summary>
/// <param name="Id">Stable id.</param>
/// <param name="DisplayName">Friendly name.</param>
/// <param name="SourceIp">IP the exporter sends from (allow-list entry).</param>
/// <param name="HomeCollector">Where this exporter's flows land ("central" or a named edge).</param>
/// <param name="LastSeenUtc">Last flow received from this exporter.</param>
/// <param name="IsEnabled">Whether records from this exporter are currently accepted.</param>
public sealed record FlowExporter(
    string Id,
    string DisplayName,
    string SourceIp,
    string HomeCollector,
    DateTime LastSeenUtc,
    bool IsEnabled);

/// <summary>A virtual interface in a workspace that can be drilled into.</summary>
/// <param name="Id">Stable id (e.g. "alpha/vm-100/net0").</param>
/// <param name="WorkspaceId">Owning workspace.</param>
/// <param name="VmId">VM that owns this interface.</param>
/// <param name="VmName">VM display name.</param>
/// <param name="Name">Interface name on the VM (e.g. "net0").</param>
/// <param name="RxBytes">Bytes received in the current window.</param>
/// <param name="TxBytes">Bytes transmitted in the current window.</param>
/// <param name="FlowCount">How many flows observed on this interface.</param>
public sealed record WorkspaceInterface(
    string Id,
    string WorkspaceId,
    int VmId,
    string VmName,
    string Name,
    long RxBytes,
    long TxBytes,
    long FlowCount);
