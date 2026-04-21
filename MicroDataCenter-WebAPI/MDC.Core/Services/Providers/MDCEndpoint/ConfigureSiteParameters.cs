namespace MDC.Core.Services.Providers.MDCEndpoint;

internal class ConfigureSiteParameters
{
    public required bool DataEgressOnMgmtNetwork { get; set; }

    public required bool SkipNetworkConfiguration { get; set; }
}
