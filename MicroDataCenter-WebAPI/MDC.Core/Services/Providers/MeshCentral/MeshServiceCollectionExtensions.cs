using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace MDC.Core.Services.Providers.MeshCentral;

/// <summary>DI registration helpers for the MeshCentral provider.</summary>
public static class MeshServiceCollectionExtensions
{
    /// <summary>Register Mesh services bound to the <c>MeshCentral</c> configuration section.</summary>
    public static IServiceCollection AddMeshCentralProvider(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection(MeshCentralOptions.ConfigurationSectionName);
        services.Configure<MeshCentralOptions>(section);

        services.TryAddSingleton<IMeshCentralClient, MockMeshCentralClient>();
        services.TryAddSingleton<MeshSessionBroker>();

        // Expose the enrollment service so controllers can trigger an immediate
        // reconcile, AND host it as a background service for periodic passes.
        services.TryAddSingleton<MeshAgentEnrollmentService>();
        services.AddHostedService(sp => sp.GetRequiredService<MeshAgentEnrollmentService>());
        return services;
    }
}
