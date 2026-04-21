using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.MDCEndpoint;

internal class MDCEndpointServiceOptions
{
    public static string ConfigurationSectionName => "MDCEndpointService";

    [JsonPropertyName("mgmtNetworkId")]
    public required string MgmtNetworkId { get; set; }

    [JsonPropertyName("proxyBaseUrl")]
    public string? ProxyBaseUrl { get; set; }
    
    [JsonPropertyName("proxmoxBackupServer")]
    public ProxmoxBackupServerOptions? ProxmoxBackupServer { get; set; }
}

internal class ProxmoxBackupServerOptions
{
    public string Id { get; set; } = "mdcimages";

    public required string Server { get; set; }

    public required string Fingerprint { get; set; }

    public required string Datastore { get; set; }

    public required string Namespace { get; set; }

    public string? UserName { get; set; }

    public string? Password { get; set; }
}
