using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEQemuConfig
{
    public string Digest { get; set; } = string.Empty;

    public string? Agent { get; set; }

    public int? Cores { get; set; }

    public string? Cpu { get; set; }

    public string? Description { get; set; }

    public string? Memory { get; set; }

    public string? Name { get; set; }

    [JsonPropertyName("smbios1")]
    public string? SMBIOS { get; set; }

    public int? Sockets { get; set; }

    public string? Tags { get; set; }

    [JsonPropertyName("onboot")]
    public int? OnBoot { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> UnknownProperties { get; set; } = [];
}
