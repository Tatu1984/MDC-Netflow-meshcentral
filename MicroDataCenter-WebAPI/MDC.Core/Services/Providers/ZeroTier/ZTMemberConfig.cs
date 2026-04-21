using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTMemberConfig
{
    public required string Id { get; set; }

    [JsonPropertyName("nwid")]
    public required string NetworkId { get; set; }

    public required string Address { get; set; }

    public required bool Authorized { get; set; }

    [JsonPropertyName("ipAssignments")]
    public string[]? IPAssignments { get; set; }

    public required bool ActiveBridge { get; set; }

    public required long CreationTime { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
