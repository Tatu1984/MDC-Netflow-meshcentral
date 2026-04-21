using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTControllerNetwork
{
    public required string Id { get; set; }

    [JsonPropertyName("nwid")]
    public required string NetworkId { get; set; }

    public required string Name { get; set; }

    public required bool Private { get; set; }

    public required int Revision { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
