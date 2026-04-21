namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class VirtualMachineNetworkAdapterDescriptor
{
    /// <summary>
    /// 
    /// </summary>
    public string? Name { get; set; }      // e.g. "net0", "net1", etc.
    /// <summary>
    /// 
    /// </summary>
    public string? RefVirtualNetworkName { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public string? MACAddress { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public bool? IsDisconnected { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public bool? IsFirewallEnabled { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public bool EnableRemoteNetwork { get; set; } = false;  // When true, the Virtual Network from RefVirtualNetworkName must have EnableRemoteNetwork = true
    /// <summary>
    /// 
    /// </summary>
    public string? RemoteNetworkIPAddress { get; set; } // The IP Address of this Network Adapter on the Remote Network.  Must be within the range of RemoteNetworkAddressCIDR
    /// <summary>
    /// 
    /// </summary>
    public VirtualNetworkDescriptorOperation? Operation { get; set; }   // TODO: Handle this when Validating and Normalizing the Descriptor
}
