using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MDC.Core.Services.Providers.NetFlow;

/// <summary>DI registration helpers for the NetFlow provider (Phases 6 + 9).</summary>
public static class NetFlowServiceCollectionExtensions
{
    /// <summary>Register the NetFlow provider services.</summary>
    public static IServiceCollection AddNetFlowProvider(this IServiceCollection services, IConfiguration configuration)
    {
        // Central + edge collectors. In production these come from a registry
        // backed by configuration / service discovery; for the thin slice we
        // register three in-process mock collectors covering the three mock
        // workspaces.
        services.AddSingleton<IFlowCollector, CentralMockFlowCollector>();
        services.AddSingleton<IFlowCollector>(new EdgeMockFlowCollector(
            id: "edge-beta",
            displayName: "Edge β (beta site)",
            workspaceId: "ws-beta",
            exporterId: "exp-beta-vsw",
            startVmid: 200,
            vmCount: 3,
            clusterShortName: "beta"));
        services.AddSingleton<IFlowCollector>(new EdgeMockFlowCollector(
            id: "edge-gamma",
            displayName: "Edge γ (gamma site)",
            workspaceId: "ws-gamma",
            exporterId: "exp-gamma-vsw",
            startVmid: 300,
            vmCount: 2,
            clusterShortName: "gamma"));

        // Coordinator fans queries out to every collector.
        services.TryAddSingleton<FederatedFlowSource>();
        services.TryAddSingleton<IFlowSource>(sp => sp.GetRequiredService<FederatedFlowSource>());
        services.TryAddSingleton<FlowQueryService>();
        return services;
    }
}
