using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTNetworkConfigIPAssignmentPool
{
    [JsonPropertyName("ipRangeEnd")]
    public required string IPRangeEnd { get; set; }

    [JsonPropertyName("ipRangeStart")]
    public required string IPRangeStart { get; set; }
}
