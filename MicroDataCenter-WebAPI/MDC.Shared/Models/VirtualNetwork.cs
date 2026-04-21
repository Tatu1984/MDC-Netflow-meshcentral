using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class VirtualNetwork
{
    /// <summary>
    /// 
    /// </summary>
    public Guid Id { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required int Index { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required string? GatewayStatus { get; set; }

    /// <summary/>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    [JsonPropertyName("gatewayWANNetworkType")]
    public required VirtualNetworkGatewayWANNetworkType? GatewayWANNetworkType { get; set; }

    /// <summary/>
    public required Guid? GatewayWANVirtualNetworkId { get; set; }

    /// <summary/>
    public required int? Cores { get; set; }

    /// <summary/>
    public required string? Memory { get; set; }

    /// <summary/>
    public required string? TemplateName { get; set; }

    /// <summary/>
    public required int? TemplateRevision { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public int? Tag { get; set; } = null;
    /// <summary>
    /// 
    /// </summary>
    public Guid? RemoteNetworkId { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public string? ZeroTierNetworkId { get; set; }
}
