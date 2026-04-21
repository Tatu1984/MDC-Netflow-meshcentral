using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTMember
{
    public required string Id { get; set; }

    [JsonPropertyName("nodeId")]
    public required string NodeId { get; set; }

    [JsonPropertyName("controllerId")]
    public required string ControllerId { get; set; }

    public string? Name { get; set; }

    public string? Description { get; set; }

    public int? Online { get; set; }

    public string? ClientVersion { get; set; }

    public int? Latency { get; set; }

    public string? PhysicalAddress { get; set; }

    public long? LastOnline { get; set; }

    public required ZTMemberConfig Config { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
