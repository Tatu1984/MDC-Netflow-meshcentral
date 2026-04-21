using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEVNCProxy
{

    public required string Port { get; set; }

    public required string Ticket { get; set; }
    
    public required string Cert { get; set; }
    
    public required string User { get; set; }

    [JsonPropertyName("upid")]
    public required string UPID { get; set; }

    public string? Password { get; set; }
}
