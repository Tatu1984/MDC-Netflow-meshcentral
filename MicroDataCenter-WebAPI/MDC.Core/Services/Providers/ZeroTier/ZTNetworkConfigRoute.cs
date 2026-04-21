using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTNetworkConfigRoute
{
    [JsonPropertyName("target")]
    public required string Target { get; set; }

    [JsonPropertyName("via")]
    public string? Via { get; set; }
}
