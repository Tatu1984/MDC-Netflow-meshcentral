namespace MDC.Shared.Models;

/// <summary />
public class RemoteNetworkRoute
{
    /// <summary>
    /// CIDR Address of Network Route
    /// </summary>
    public required string Target { get; set; }

    /// <summary>
    /// Gateway IP Address for the NetworK Route.   Optional. When null the Gateway is the LAN
    /// </summary>
    public string? Via { get; set; }
}
