using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.ZeroTier;

// See https://docs.zerotier.com/api/service/v1/#tag/network/operation/getNetwork

internal class ZTNetworkMembership
{
    public required string Id { get; set; }

    [JsonPropertyName("nwid")]
    public required string NetworkId { get; set; }

    [JsonPropertyName("mac")]
    public required string MACAddress { get; set; }

    [JsonPropertyName("assignedAddresses")]
    public required string[] AssignedAddresses { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
