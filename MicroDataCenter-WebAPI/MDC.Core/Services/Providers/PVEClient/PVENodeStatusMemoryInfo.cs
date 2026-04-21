using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVENodeStatusMemoryInfo
{
    [JsonPropertyName("used")]
    public required long Used { get; set; }

    [JsonPropertyName("total")]
    public required long Total { get; set; }

    [JsonPropertyName("free")]
    public required long Free { get; set; }
}
