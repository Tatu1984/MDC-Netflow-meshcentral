using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEQemuStatus
{
    // public required string Status { get; set; }
    [JsonPropertyName("qmpstatus")]
    public string? Qmpstatus { get; set; }

    public int? Agent { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
