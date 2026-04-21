using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class DatacenterNodeCPUInfo
{
    /// <summary>
    /// 
    /// </summary>
    public required int Sockets { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required int Cores { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required string Model { get; set; }

    /// <summary>
    /// 
    /// </summary>
    [JsonPropertyName("cpus")]
    public required int CPUs { get; set; }

    /// <summary>
    /// 
    /// </summary>
    [JsonPropertyName("mhz")]
    public required decimal MHZ { get; set; }
}
