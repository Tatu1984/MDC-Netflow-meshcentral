using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class VirtualMachineTemplate
{
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required int Revision { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required int? Cores { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required string? Memory { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required VirtualMachineStorage[] Storage { get; set; }
}
