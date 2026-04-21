using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZeroTierServiceOptions
{
    public static string ConfigurationSectionName => "ZeroTierService";

    public required string BaseUrl { get; set; }

    public required string Username { get; set; }

    public required string Password { get; set; }

    public bool ValidateServerCertificate { get; set; } = true; // Default to validating server certificate
    public int? Timeout { get; set; } // Default timeout in seconds is 30 seconds
}
