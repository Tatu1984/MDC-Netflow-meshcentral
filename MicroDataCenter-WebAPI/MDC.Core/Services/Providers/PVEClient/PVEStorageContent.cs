using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEStorageContent
{
    public required string Format { get; set; }

    public required long Size { get; set; }

    [JsonPropertyName("volid")]
    public required string VolumeId { get; set; }

    public string? Content { get; set; }

    [JsonPropertyName("subtype")]
    public string? SubType { get; set; }

    public string? Notes { get; set; }

    [JsonPropertyName("vmid")]
    public int? VMID { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
