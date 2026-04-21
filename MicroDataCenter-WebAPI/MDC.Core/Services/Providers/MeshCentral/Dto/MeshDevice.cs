namespace MDC.Core.Services.Providers.MeshCentral.Dto;

/// <summary>A Mesh-managed device (agent).</summary>
/// <param name="NodeId">MeshCentral node identifier.</param>
/// <param name="GroupId">Mesh device group (scoped per workspace).</param>
/// <param name="Name">Display name.</param>
/// <param name="Online">Whether the agent is currently online.</param>
/// <param name="AgentVersion">Agent version string.</param>
/// <param name="LastSeenUtc">Last agent heartbeat time.</param>
public sealed record MeshDevice(
    string NodeId,
    string GroupId,
    string Name,
    bool Online,
    string AgentVersion,
    DateTime LastSeenUtc);
