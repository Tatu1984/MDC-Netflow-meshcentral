using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum VirtualNetworkDescriptorOperation
{
    /// <summary>
    /// 
    /// </summary>
    None,
    /// <summary>
    /// 
    /// </summary>
    Add,
    /// <summary>
    /// 
    /// </summary>
    Update,
    /// <summary>
    /// 
    /// </summary>
    Remove
}

/// <summary>
/// 
/// </summary>
public class VirtualNetworkDescriptor
{
    /// <summary>
    /// Optional.  When not specified, the name "vnetXX" will be generated, where XX is a zero padded incrementing number starting with 0 for the next available unique value.   Virtual Network Names must be unique within a Workspace.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Optional.  When not specified and this is the Primary Virtual Network, a Gateway will automatically be used using default values
    /// </summary>
    public VirtualNetworkGatewayDescriptor? Gateway { get; set; }

    /// <summary>
    /// Optional.  When not specified, the default value is false.  When true a new ZeroTier network will be created on the configured ZeroTier controller
    /// </summary>
    public bool EnableRemoteNetwork { get; set; } = false;

    /// <summary>
    /// Optional.   Only valid when enableRemoteNetwork = true.  Value must be a valid Network Address in CIDR notation.  When not specified and enableRemoteNetwork = true, the default value from Datacenter settings is used
    /// </summary>
    public string? RemoteNetworkAddressCIDR { get; set; } = null;

    /// <summary>
    /// Optional.  Only valid when enableRemoteNetwork = true and remoteNetworkAddressCIDR has a value.  The IP Address must be within the Network Domain of remoteNetworkAddressCIDR.  When not specified and enableRemoteNetwork = true, the default value from Datacenter settings is used
    /// </summary>
    public string? RemoteNetworkIPRangeStart { get; set; } = null;

    /// <summary>
    /// Optional.  Only valid when enableRemoteNetwork = true and remoteNetworkAddressCIDR has a value.  The IP Address must be within the Network Domain of remoteNetworkAddressCIDR.  When not specified and enableRemoteNetwork = true, the default value from Datacenter settings is used
    /// </summary>
    public string? RemoteNetworkIPRangeEnd { get; set; } = null;

    /// <summary>
    /// Optional.  Acceptable values are None, Add, update, Remove.   When operation = Remove, the Name property must be specified.  The Primary Virtual Network cannot be removed.  When not specified and Name is not specified, the operation will be Add.  When not specified and Name is specified, when there is an existing Virtual Network having the same name, the operation will be Update.  When not specified and the Name is specified, when there is not an existing Virtual Network having the same name, the operation will be Add.
    /// </summary>
    public VirtualNetworkDescriptorOperation? Operation { get; set; }
}
