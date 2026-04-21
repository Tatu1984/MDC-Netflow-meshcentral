using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVETask
{
    [JsonPropertyName("upid")]
    public required string UPID { get; set; }

    public string? Id { get; set; }

    [JsonPropertyName("pid")]
    public long? Pid { get; set; }

    // public string? Saved { get; set; }

    public string? Type { get; set; }

    public string? Node { get; set; }

    public string? Status { get; set; }

    public string? User { get; set; }

    [JsonPropertyName("starttime")]
    public long? StartTime { get; set; }

    [JsonPropertyName("endtime")]
    public long? EndTime { get; set; }
}
