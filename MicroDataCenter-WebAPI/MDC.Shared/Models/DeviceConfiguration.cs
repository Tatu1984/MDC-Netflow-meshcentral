using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class DeviceConfiguration
{
    /// <summary>
    /// 
    /// </summary>
    public Guid Id { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }
    
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
    public IEnumerable<DeviceConfigurationNetworkInterface> NetworkInterfaces { get; set; } = new List<DeviceConfigurationNetworkInterface>();
}
