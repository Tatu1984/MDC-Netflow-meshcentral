using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVENodeNetwork
{
    [JsonPropertyName("iface")]
    public required string NetworkInterfaceName { get; set; }

    [JsonPropertyName("type")]
    public required string NetworkInterfaceType { get; set; }   // expected to be "bridge" or "eth"

    [JsonPropertyName("active")]
    public int? Active { get; set; }

    [JsonPropertyName("autostart")]
    public int? Autostart { get; set; }

    [JsonPropertyName("method")]
    public string? Method { get; set; } 


    [JsonPropertyName("method6")]
    public string? Method6 { get; set; }

    [JsonPropertyName("cidr")]
    public string? CIDR { get; set; }

    [JsonPropertyName("address")]
    public string? Address { get; set; }

    [JsonPropertyName("gateway")]
    public string? Gateway { get; set; }

    [JsonPropertyName("comments")]
    public string? Comments { get; set; }

    [JsonPropertyName("altnames")]
    public string[]? AltNames { get; set; }

    [JsonPropertyName("bridge_ports")]
    public string? BridgePorts { get; set; }

    [JsonPropertyName("priority")]
    public int? Priority { get; set; }

    [JsonPropertyName("exists")]
    public int? Exists { get; set; }

    [JsonPropertyName("bridge_vlan_aware")]
    public int? BridgeVLANAware { get; set; }   // When set, expect NetworkInterfaceType == "bridge"

    [JsonPropertyName("options")]
    public string[]? Options { get; set; }


    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
