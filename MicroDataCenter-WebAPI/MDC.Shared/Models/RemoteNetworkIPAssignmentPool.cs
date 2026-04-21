using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary />
public class RemoteNetworkIPAssignmentPool
{
    /// <summary />
    [JsonPropertyName("ipRangeEnd")]
    public required string IPRangeEnd { get; set; }

    /// <summary />
    [JsonPropertyName("ipRangeStart")]
    public required string IPRangeStart { get; set; }
}
