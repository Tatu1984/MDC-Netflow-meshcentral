using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVETaskStatus
{
    public required string Id { get; set; }
    
    public required string Node { get; set; }

    [JsonPropertyName("pid")]
    public required int Pid { get; set; }

    [JsonPropertyName("pstart")]
    public required int pstart { get; set; }
    
    [JsonPropertyName("starttime")]
    public required long StartTime { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required PVETaskStatusType Status { get; set; }
    
    public required string Type { get; set; }

    [JsonPropertyName("upid")]
    public required string UpId { get; set; }

    public required string User { get; set; }

    [JsonPropertyName("ExitStatus")]
    public string? ExitStatus { get; set; } = null;

    public DateTimeOffset GetStartTime() => DateTimeOffset.FromUnixTimeSeconds(StartTime);
}

internal enum PVETaskStatusType
{
    Running,
    Stopped
}
