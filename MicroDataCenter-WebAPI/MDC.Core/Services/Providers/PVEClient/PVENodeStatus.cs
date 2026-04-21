using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVENodeStatus
{
    [JsonPropertyName("cpuinfo")]
    public required PVENodeStatusCPUInfo CPUInfo { get; set; }

    [JsonPropertyName("memory")]
    public required PVENodeStatusMemoryInfo Memory { get; set; }

    [JsonPropertyName("cpu")]
    public required decimal CPU { get; set; }
}
