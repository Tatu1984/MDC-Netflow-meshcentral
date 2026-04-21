using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class VirtualMachineStorage
{
    /// <summary>
    /// 
    /// </summary>
    public required string ControllerType { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required int ControllerIndex { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required long? Size { get; set; }
}
