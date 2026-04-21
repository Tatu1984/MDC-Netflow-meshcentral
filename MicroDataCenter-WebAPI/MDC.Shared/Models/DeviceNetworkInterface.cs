using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class DeviceNetworkInterface
{
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public Guid? VirtualNetworkId { get; set; }
}
