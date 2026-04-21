using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTNetwork
{
    public required string Id { get; set; }

    public string? Description { get; set; }

    public required ZTNetworkConfig Config { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
