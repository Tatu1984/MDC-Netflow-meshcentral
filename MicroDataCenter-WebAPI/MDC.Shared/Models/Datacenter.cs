using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class Datacenter
{
    /// <summary>
    /// 
    /// </summary>
    public required Guid Id { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required string Description { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required DatacenterSettings DatacenterSettings { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required DatacenterNode[] DatacenterNodes { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required Workspace[] Workspaces { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required DeviceConfiguration[] DeviceConfigurations { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required VirtualMachineTemplate[] GatewayTemplates { get; set;}
    
    /// <summary>
    /// 
    /// </summary>
    public required VirtualMachineTemplate[] VirtualMachineTemplates { get; set; }
}
