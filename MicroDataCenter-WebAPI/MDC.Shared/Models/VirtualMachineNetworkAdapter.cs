namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class VirtualMachineNetworkAdapter
{
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required Guid? VirtualNetworkId { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string? MACAddress { get; set; }
    
    /// <summary/>
    public required bool IsDisconnected { get; set; }

    /// <summary/>
    public required bool IsFirewallEnabled { get; set; }

    /// <summary/>
    public required VirtualMachineNetworkInterface[]? NetworkInterfaces { get; set; } 
}
