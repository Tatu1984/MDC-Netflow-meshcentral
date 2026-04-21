using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class VirtualMachineNetworkInterface
{
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string MACAddress { get; set; }
    
    /// <summary>
    /// 
    /// </summary>
    public string? IPAddress { get; set; }
    
    /// <summary>
    /// 
    /// </summary>
    public int? Prefix { get; set; }
}
