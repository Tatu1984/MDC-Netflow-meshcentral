using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVENodeStatusCPUInfo
{
    public required int Sockets { get; set; }

    public required int Cores { get; set; }

    public required string Model { get; set; }

    [JsonPropertyName("cpus")]
    public required int CPUs { get; set; }

    [JsonPropertyName("mhz")]
    public required decimal MHZ { get; set; }
}
