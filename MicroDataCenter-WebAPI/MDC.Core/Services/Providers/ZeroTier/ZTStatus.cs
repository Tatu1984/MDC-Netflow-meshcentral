using System.Text.Json;
using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTStatus
{
    public required string Address { get; set; }

    public required bool Online { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
