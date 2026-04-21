using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary>
/// Network which the WAN interface of the Virtual Network Gateway is connected to.
/// </summary>
public enum VirtualNetworkGatewayWANNetworkType
{
    /// <summary>
    /// Connect the Gateway WAN through the Data network, having egress to the internet. 
    /// </summary>
    Egress,
    /// <summary>
    /// Connect the Gateway WAN to another Virtual Network within the workspace.  RefGatewayWANVirtualNetworkName must have a value of a valid Virtual Network within the Workspace.
    /// </summary>
    Internal,
    /// <summary>
    /// When supported by MDC configuration, connect the Gateway WAN to the outside network bridge interface of MDC.  This setting allows the possibility in inbound network connections and should be used with caution.
    /// </summary>
    Public
}

/// <summary>
/// 
/// </summary>
public class VirtualNetworkGatewayDescriptor
{
    /// <summary>
    /// Optional.  When not specified, the default Gateway Template Name will be used
    /// </summary>
    public string? TemplateName { get; set; }

    /// <summary>
    /// Optional.  When not specified, the default Gateway Template Revision or the highest revision for the templateName will be used
    /// </summary>
    public int? TemplateRevision { get; set; }

    /// <summary>
    /// Network which the WAN interface of the Virtual Network Gateway is connected to.
    /// </summary>
    /// <remarks>
    /// Optional.  Acceptable values are Egress, Internal, Public.  When not specified, and this is the only Virtual Network, wanNetworkType will be Egress; additional Virtual Networks will be Internal.   The Public value is only acceptable when the Micro Datacenter configuration supports it.
    /// </remarks>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    [JsonPropertyName("wanNetworkType")]
    public VirtualNetworkGatewayWANNetworkType? WANNetworkType { get; set; }

    /// <summary>
    /// Optional.  Only valid when WANNetworkType = Internal.  Acceptable value must be the Name of any Virtual Network in the Workspace, except this Virtual Network. 
    /// When WANNetworkType = Internal, RefGatewayWANVirtualNetworkName must have a value of a valid Virtual Network within the Workspace
    /// </summary>
    public string? RefInternalWANVirtualNetworkName { get; set; }

    /// <summary>
    /// Optional.  Acceptable values are None, Add, Update, Remove, Reboot, Restart, Redeploy.  The Gateway cannot be removed for the Primary Virtual Network
    /// </summary>
    public VirtualMachineDescriptorOperation? Operation { get; set; }

}
