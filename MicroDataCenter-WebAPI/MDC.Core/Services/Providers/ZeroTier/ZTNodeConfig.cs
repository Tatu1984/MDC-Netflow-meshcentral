using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTNodeConfig
{
    public required string Address { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
