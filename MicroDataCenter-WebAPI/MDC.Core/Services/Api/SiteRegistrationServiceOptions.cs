using System.Text.Json.Serialization;

namespace MDC.Core.Services.Api;

internal class SiteRegistrationServiceOptions
{
    public static string ConfigurationSectionName => "SiteRegistrationService";

    public string Keyboard { get; set; } = "en-us";

    public string Country { get; set; } = "us";

    [JsonPropertyName("domainName")]
    public string DomainName { get; set; } = "technest";

    [JsonPropertyName("mailTo")]
    public string MailTo { get; set; } = "mdc@tensparrows.com";

    [JsonPropertyName("timezone")]
    public string Timezone { get; set; } = "America/New_York";

    [JsonPropertyName("rootPassword")]
    public required string RootPassword { get; set; }

    [JsonPropertyName("postInstallationWebhookUrl")]
    public required string PostInstallationWebhookUrl { get; set; }

    [JsonPropertyName("postInstallationWebhookFingerprint")]
    public string? PostInstallationWebhookFingerprint { get; set; }

    [JsonPropertyName("firstBootUrl")]
    public required string FirstBootUrl { get; set; }

    [JsonPropertyName("firstBootFingerprint")]
    public string? FirstBootFingerprint { get; set; }
}
