using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.DatacenterFactory;
using MDC.Core.Services.Providers.DtoEnrichment;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.MeshCentral;
using MDC.Core.Services.Providers.NetFlow;
using MDC.Core.Services.Providers.ProxmoxDatacenterManager;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using MDC.Core.Services.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MDC.Core.Extensions;

/// <summary>
/// 
/// </summary>
public static class MDCServiceCollectionExtensions
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="services"></param>
    /// <param name="configuration"></param>
    /// <returns></returns>
    public static IServiceCollection AddMicroDatacenterCore(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddMemoryCache();

        services.TryAddSingleton<IConfiguration>(configuration);
        services.TryAddSingleton<IPVEClientFactory, PVEClientFactory>();

        services.TryAddTransient<IDtoEnrichmentService, DtoEnrichmentService>();
        services.AddScoped<IEnrichmentContext, EnrichmentContext>();

        services.TryAddTransient<IDatacenterFactoryService, DatacenterFactoryService>();
        services.TryAddTransient<IWorkspaceService, WorkspaceService>();
        //services.TryAddTransient<IDeviceConfigurationService, DeviceConfigurationService>();
        services.TryAddTransient<IOrganizationService, OrganizationService>();
        services.TryAddTransient<ISiteService, SiteService>();
        
        services.TryAddTransient<ISiteNodeRegistrationService, SiteNodeRegistrationService>();
        var siteRegistrationServiceOptions = configuration.GetSection(SiteRegistrationServiceOptions.ConfigurationSectionName);
        if (siteRegistrationServiceOptions != null)
        {
            services.Configure<SiteRegistrationServiceOptions>(siteRegistrationServiceOptions);
        }

        services.TryAddTransient<IUserService, UserService>();
        services.Configure<UserServiceOptions>(configuration.GetSection(UserServiceOptions.ConfigurationSectionName));

        services.TryAddTransient<IRemoteNetworkService, RemoteNetworkService>();
        services.TryAddTransient<IVNCRelay, VNCRelay>();

        // Proxmox Datacenter Manager (observability source)
        services.AddPdmProvider(configuration);

        // Security — access tier resolution shared across Observability, NetFlow, Mesh endpoints.
        services.TryAddSingleton<IWorkspaceMembershipResolver, MockWorkspaceMembershipResolver>();
        services.TryAddSingleton<ITierResolver, TierResolver>();
        services.TryAddSingleton<IVmWorkspaceMap, MockVmWorkspaceMap>();

        // MeshCentral (trust broker for browser remote connectivity)
        services.AddMeshCentralProvider(configuration);

        // NetFlow (tiered distributed flow analytics)
        services.AddNetFlowProvider(configuration);

        // Add MDC Endpoint Service
        services.TryAddScoped<IMDCEndpointService, MDCEndpointService>();
        var mdcEndpointServiceOptions = configuration.GetSection(MDCEndpointServiceOptions.ConfigurationSectionName);
        if (mdcEndpointServiceOptions != null)
        {
            services.Configure<MDCEndpointServiceOptions>(mdcEndpointServiceOptions);
        }

        // Add MDC Database Service
        services.AddDbContext<MDCDbContext>();
        services.TryAddTransient<IMDCDatabaseService, MDCDatabaseService>();
        services.TryAddTransient<IDatabaseMigrationService, DatabaseMigrationService>();
        services.TryAddTransient<IActivityLogService, ActivityLogService>();

        // Add ZeroTier Service
        services.TryAddTransient<IZeroTierService, ZeroTierService>();
        var zeroTierServiceOptions = configuration.GetSection(ZeroTierServiceOptions.ConfigurationSectionName);
        if (zeroTierServiceOptions.Exists())
        {
            services.Configure<ZeroTierServiceOptions>(zeroTierServiceOptions);

            services.TryAddSingleton<IZeroTierTokenProvider, ZeroTierTokenProvider>();
            services.TryAddTransient<ZeroTierAuthHandler>();

            services.AddHttpClient<IZeroTierService, ZeroTierService>((serviceProvider, httpClient) =>
            {
                var options = serviceProvider.GetRequiredService<IOptions<ZeroTierServiceOptions>>();
                var option = options.Value;

                httpClient.BaseAddress = new Uri(option.BaseUrl.TrimEnd('/') + "/");
                //httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($"{option.Username}:{option.Password}")));

                //httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                if (option.Timeout.HasValue)
                {
                    httpClient.Timeout = TimeSpan.FromSeconds(option.Timeout.Value);
                }
            })
            .AddHttpMessageHandler<ZeroTierAuthHandler>()
            .ConfigurePrimaryHttpMessageHandler((serviceProvider) =>
            {
                var options = serviceProvider.GetRequiredService<IOptions<ZeroTierServiceOptions>>();
                var option = options.Value;
                return new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = option.ValidateServerCertificate ?
                        null // Use the default validation if not bypassing
                        : (message, cert, chain, errors) => true // Bypass SSL validation for testing
                };
            });

            services.AddHttpClient<IZeroTierTokenProvider, ZeroTierTokenProvider>((serviceProvider, httpClient) =>
            {
                var options = serviceProvider.GetRequiredService<IOptions<ZeroTierServiceOptions>>();
                var option = options.Value;

                httpClient.BaseAddress = new Uri(option.BaseUrl.TrimEnd('/') + "/");
                if (option.Timeout.HasValue)
                {
                    httpClient.Timeout = TimeSpan.FromSeconds(option.Timeout.Value);
                }
            })
            .ConfigurePrimaryHttpMessageHandler((serviceProvider) =>
            {
                var options = serviceProvider.GetRequiredService<IOptions<ZeroTierServiceOptions>>();
                var option = options.Value;
                return new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = option.ValidateServerCertificate ?
                        null // Use the default validation if not bypassing
                        : (message, cert, chain, errors) => true // Bypass SSL validation for testing
                };
            });
        }

        return services;
    }

    /// <summary>
    /// Applies database migrations and initializes datacenter data on application startup
    /// </summary>
    /// <param name="scope">The application service scope</param>
    /// <param name="cancellationToken">The async cancellation token</param>
    /// <returns>The application builder for chaining</returns>
    public static async Task<IServiceScope> UseMicroDatacenterMigrationsAsync(this IServiceScope scope, CancellationToken cancellationToken = default)
    {        
        var migrationService = scope.ServiceProvider.GetRequiredService<IDatabaseMigrationService>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<IDatabaseMigrationService>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        
        try
        {
            // Check if migrations should run based on environment variable
            var shouldRunMigrations = configuration.GetValue<bool>("API_RUN_DB_MIGRATIONS", false);

            // Check if this is a new database before running migrations
            var isNewDatabase = await migrationService.IsNewDatabaseAsync(cancellationToken);

            if (isNewDatabase)
            {
                logger.LogInformation("New database detected.");

                if (shouldRunMigrations)
                {
                    logger.LogInformation("Initializing database data...");

                    var success = await migrationService.MigrateAsync(cancellationToken);
                    logger.LogInformation("Database initialization completed");
                }
                else
                {
                    logger.LogWarning("New database detected but migrations are disabled via API_RUN_DB_MIGRATIONS environment variable. The application will not function correctly without migrations and data initialization.");
                }
            }
            else
            {
                // For existing database
                logger.LogInformation("Existing database detected.");

                // Check for pending migrations and log them
                var pendingMigrations = await migrationService.GetPendingMigrationsAsync(cancellationToken);
                if (pendingMigrations.Any())
                {
                    logger.LogWarning("Found {Count} pending migrations: {Migrations}", pendingMigrations.Count(), string.Join(", ", pendingMigrations));

                    if (shouldRunMigrations)
                    {
                        logger.LogInformation("Running pending migrations...");
                        var migrationsApplied = await migrationService.MigrateAsync(cancellationToken);
                        logger.LogInformation("Database migration completed successfully");
                    }
                    else
                    {
                        logger.LogWarning("Pending migrations found but migrations are disabled via API_RUN_DB_MIGRATIONS environment variable. The application will continue without applying pending migrations may not function correctly.");
                    }
                }
                else
                {
                    logger.LogInformation("Database is up to date - no pending migrations found");
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while migrating the database or initializing data");
            // throw;
        }

        return scope;
    }
}