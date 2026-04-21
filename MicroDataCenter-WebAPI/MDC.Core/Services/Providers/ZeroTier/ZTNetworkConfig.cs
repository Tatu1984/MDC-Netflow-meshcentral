using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTNetworkConfig
{
    public required string Id { get; set; }

    public required string Name { get; set; }

    [JsonPropertyName("nwid")]
    public required string NetworkId { get; set; }

    public required bool Private { get; set; }

    [JsonPropertyName("ipAssignmentPools")]
    public required ZTNetworkConfigIPAssignmentPool[] IpAssignmentPools { get; set; }

    [JsonPropertyName("routes")]
    public required ZTNetworkConfigRoute[] Routes { get; set; }
    
    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
