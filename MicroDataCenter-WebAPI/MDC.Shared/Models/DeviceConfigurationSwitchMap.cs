using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class DeviceConfigurationSwitchMap
{   /// <summary>
    /// 
    /// </summary>
    public required string SwitchProvider { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string SwitchId { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string PortId { get; set; }
}
