using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class Device
{
    /// <summary>
    /// 
    /// </summary>
    public Guid Id { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string Type { get; set; } 
    /// <summary>
    /// 
    /// </summary>
    public required string SerialNumber { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public IEnumerable<DeviceNetworkInterface> NetworkInterfaces { get; set; } = new List<DeviceNetworkInterface>();
}
