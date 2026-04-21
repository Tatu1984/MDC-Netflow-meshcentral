using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary />
public class SiteNodeCPUInfo
{
    /// <summary />
    public required int Sockets { get; set; }

    /// <summary />
    public required int Cores { get; set; }

    /// <summary />
    public required string Model { get; set; }

    /// <summary />
    [JsonPropertyName("cpus")]
    public required int CPUs { get; set; }

    /// <summary />
    [JsonPropertyName("mhz")]
    public required decimal MHZ { get; set; }
}
