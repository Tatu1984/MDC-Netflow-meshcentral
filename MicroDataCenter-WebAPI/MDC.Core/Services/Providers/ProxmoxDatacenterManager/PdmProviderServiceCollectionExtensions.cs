using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager;

/// <summary>DI registration helpers for the PDM provider.</summary>
public static class PdmProviderServiceCollectionExtensions
{
    /// <summary>
    /// Register the PDM provider services bound to the <c>Pdm</c> configuration section.
    /// When <c>Pdm:UseMock=true</c> (default), the in-process <see cref="MockPdmClient"/> is used.
    /// When <c>Pdm:UseMock=false</c>, data is pulled live from the real Proxmox clusters
    /// registered in the MDC database via <see cref="PveBackedPdmClient"/>.
    /// </summary>
    public static IServiceCollection AddPdmProvider(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection(PdmClientOptions.ConfigurationSectionName);
        services.Configure<PdmClientOptions>(section);

        var options = section.Get<PdmClientOptions>() ?? new PdmClientOptions();

        if (options.UseMock)
        {
            services.TryAddSingleton<IPdmClient, MockPdmClient>();
        }
        else
        {
            // Live mode — reads DbSite rows and talks to real PVE clusters.
            services.TryAddSingleton<IPdmClient, PveBackedPdmClient>();
        }
        services.TryAddSingleton<PdmTelemetryCache>();

        return services;
    }
}
