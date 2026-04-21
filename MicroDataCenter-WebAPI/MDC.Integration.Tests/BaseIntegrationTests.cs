using Azure.Identity;
using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Tests;
using MDC.Shared.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Graph;
using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Xunit.Sdk;

namespace MDC.Integration.Tests;

public abstract class BaseIntegrationTests : BaseServicesTests
{
    internal const string DefaultOrganization = "Integration Test";

    // private const string THEORY_CONFIGURATION_SECTION = "theory";
    /*
     * secrets.json file is used to load the configuration.
     * It should have the following structure such that each theory can override the configuration for testing against different environments.
     
{
    "ZeroTierService": {
        "baseUrl": "http://10.255.255.2:4000/",
        "username": "admin",
        "password": "*****",
        "validateServerCertificate": false
      },
      "MDCEndpointService": {
        "mgmtNetworkId": "a972acb27b930a04"
      },
      "ConnectionStrings": {
        "DefaultConnection": "Server=tcp:microdatacenter.database.windows.net,1433;Initial Catalog=microdatacenter;Persist Security Info=False;User ID=microdatacenter-server-admin;Password=*****;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=60;"
      },
      "API_RUN_DB_MIGRATIONS": false,
      "<TestConfigurationTheoryDataAttribute>": {
        "<class data key>": <test class specific data>
    }
}
    
     * Each theory will receive a IConfigurationSection corresponding to its configuration key under the "TestConfigurationTheoryDataAttribute" section.
     */

    public static IEnumerable<TheoryDataRow<IConfigurationSection>> GetTheoryDataRows(string theoryConfigurationSection)
    {
        ConfigurationManager configurationManager = new ConfigurationManager();
        configurationManager.AddUserSecrets(Assembly.GetExecutingAssembly());
        foreach (var section in configurationManager.GetSection(theoryConfigurationSection).GetChildren())
        {
            var row = new TheoryDataRow<IConfigurationSection>(section)
                .WithTestDisplayName($"{theoryConfigurationSection}.{section.Key}");
                //.WithTrait("TheoryConfigurationKey", section.Key);
            if (!System.Diagnostics.Debugger.IsAttached)
                row.Skip = "Integration Tests require debugger to be attached";
            yield return row;
        }
    }

    internal IServiceScope AssembleIntegrationTest(IServiceCollection serviceDescriptors, IConfigurationSection? theoryConfiguration)
    {
        if (!System.Diagnostics.Debugger.IsAttached)
        {
            throw SkipException.ForSkip("Integration Tests require debugger to be attached");
        }

        // Build the configuration
        ConfigurationBuilder configurationBuilder = new ConfigurationBuilder();
        configurationBuilder.AddUserSecrets(Assembly.GetExecutingAssembly());

        var configuration = configurationBuilder.Build();
        Assert.NotNull(configuration);

        // Add an override configuration from the appsettings.json file
        if (theoryConfiguration != null)
        {
            ConfigurationBuilder overrideConfigurationBuilder = new ConfigurationBuilder();
            overrideConfigurationBuilder.AddConfiguration(configuration);

            // Copy all of the children of the override section to the configuration builder
            var children = theoryConfiguration
                .GetChildren()
                .SelectMany(child => child.AsEnumerable(), (section, entry) => new KeyValuePair<string, string?>(entry.Key.Remove(0, theoryConfiguration.Path.Length  + 1), entry.Value))
                .ToArray();
            Assert.NotNull(children);

            overrideConfigurationBuilder.AddInMemoryCollection(children);
    
            configuration = overrideConfigurationBuilder.Build();
        }

        serviceDescriptors.TryAddSingleton<GraphServiceClient>(sp =>
        {
            // The client credentials flow requires that you request the
            // /.default scope, and pre-configure your permissions on the
            // app registration in Azure. An administrator must grant consent
            // to those permissions beforehand.
            var scopes = new[] { "https://graph.microsoft.com/.default" };
            var clientId = configuration["AzureAd:ClientId"];
            var tenantId = configuration["AzureAd:TenantId"]; 
            var clientSecret = configuration["AzureAd:ClientSecret"];

            var authProvider = new ClientSecretCredential(tenantId, clientId, clientSecret);
            return new GraphServiceClient(authProvider, scopes);
        });

        return AssembleServicesTest(serviceDescriptors, configuration, false);
    }

    protected void RunAsPrivileged(IServiceScope serviceScope)
    {
        var tenantContext = serviceScope.ServiceProvider.GetRequiredService<ITenantContext>();
        Assert.NotNull(tenantContext.ObjectId);

        var configuration = serviceScope.ServiceProvider.GetRequiredService<IConfiguration>();
        var runAsUserId = configuration.GetValue<string>("IntegrationTest_RunAsUserId");
        Assert.NotNull(runAsUserId);
        // Make sure that the runAsUserId is registered
        var userId = Guid.Parse(runAsUserId);
        ((TestMDCPrincipalAccessor)tenantContext).IsPrivilegedUser = true;
        ((TestMDCPrincipalAccessor)tenantContext).ObjectId = userId;
    }

    protected async Task DeleteWorkspaceAsync(IServiceScope serviceScope, string[] workspaceNames)
    {
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();
        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var existingWorkpaces = (await workspaceService.GetAllAsync(TestContext.Current.CancellationToken)).ToList();
        foreach (var existing in existingWorkpaces.Where(i => workspaceNames.Contains(i.Name)))
        {
            await workspaceService.SetWorkspaceLockAsync(existing.Id, false, TestContext.Current.CancellationToken);
            await workspaceService.DeleteAsync(existing.Id, TestContext.Current.CancellationToken);
        }
    }

    protected async Task<Workspace> CreateWorkspaceAsync(IServiceScope serviceScope, Guid siteId, Guid organizationId, JsonNode descriptor)
    {
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        // Clone the descriptor by serializing and deserializing to ensure no reference issues so that the descriptor can be compared against the Workspace
        var workspaceDescriptor = JsonSerializer.Deserialize<WorkspaceDescriptor>(JsonSerializer.Serialize(descriptor, JsonSerializerOptions.Web), JsonSerializerOptions.Web);
        Assert.NotNull(workspaceDescriptor);
        Assert.NotNull(workspaceDescriptor.Name);
        Assert.NotEmpty(workspaceDescriptor.Name);

        var workspace = await workspaceService.CreateAsync(new CreateWorkspaceParameters { SiteId = siteId, OrganizationId = organizationId, Descriptor = workspaceDescriptor }, TestContext.Current.CancellationToken);
        Assert.NotNull(workspace.Name);
        Assert.NotEmpty(workspace.Name);
        Assert.Equal(descriptor["name"]?.GetValue<string>(), workspace.Name);
        Assert.NotEqual(Guid.Empty, workspace.Organization?.Id);

        return workspace;
    }

    private async Task WaitForDownloadAsync(ISiteService siteService, Guid siteId, CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        bool complete = false;
        while (sw.Elapsed.TotalSeconds < 60)
        {
            var status = await siteService.GetDownloadTemplateStatusAsync(siteId, TestContext.Current.CancellationToken);
            if (status == null)
            {
                complete = true;
                break;
            }
        }
        Assert.True(complete);
    }

    protected async Task EnsureVirtualMachineTemplates(IServiceScope serviceScope, Site site, WorkspaceDescriptor descriptor)
    {
        if (!(descriptor.VirtualMachines ?? []).Any(vm => vm.TemplateName != null))
            return;

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        var siteDetail = await siteService.GetByIdAsync(site.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(siteDetail);

        var downloadableTemplates = await siteService.GetDownloadableTemplatesAsync(site.Id, TestContext.Current.CancellationToken);

        {
            var requiredVMTemplates = (descriptor.VirtualMachines ?? []).Where(i => i.TemplateName != null).Select(i =>
                new
                {
                    i.TemplateName,
                    i.TemplateRevision
                })
                .ToArray();

            foreach (var requiredVMTemplate in requiredVMTemplates)
            {
                var existingVMTemplate = siteDetail.VirtualMachineTemplates?.FirstOrDefault(i => i.Name == requiredVMTemplate.TemplateName && (requiredVMTemplate.TemplateRevision == null || requiredVMTemplate.TemplateRevision == i.Revision));

                if (existingVMTemplate != null)
                    continue;

                // Find the downloadable template
                var downloadableTemplate = downloadableTemplates.FirstOrDefault(i => i.Name == requiredVMTemplate.TemplateName && (requiredVMTemplate.TemplateRevision == null || requiredVMTemplate.TemplateRevision == i.Revision));
                Assert.NotNull(downloadableTemplate);

                // Note - only one template can be downloaded at a time - check if download already in progress
                await WaitForDownloadAsync(siteService, site.Id, TestContext.Current.CancellationToken);

                var response = await siteService.DownloadTemplateAsync(site.Id, new DownloadTemplateDescriptor
                {
                    Digest = downloadableTemplate.Digest
                },
                TestContext.Current.CancellationToken);

                // Note - only one template can be downloaded at a time
                await WaitForDownloadAsync(siteService, site.Id, TestContext.Current.CancellationToken);
            }
        }

        {
            var requiredGWTemplates = (descriptor.VirtualNetworks ?? []).Where(i => i.Gateway?.TemplateName != null).Select(i =>
            new
            {
                i.Gateway!.TemplateName,
                i.Gateway.TemplateRevision
            })
            .ToArray();

            foreach (var requiredGWTemplate in requiredGWTemplates)
            {
                var existingGWTemplate = siteDetail.GatewayTemplates?.FirstOrDefault(i => i.Name == requiredGWTemplate.TemplateName && (requiredGWTemplate.TemplateRevision == null || requiredGWTemplate.TemplateRevision == i.Revision));

                if (existingGWTemplate != null)
                    continue;

                // Find the downloadable template
                var downloadableTemplate = downloadableTemplates.FirstOrDefault(i => i.Name == requiredGWTemplate.TemplateName && (requiredGWTemplate.TemplateRevision == null || requiredGWTemplate.TemplateRevision == i.Revision));
                Assert.NotNull(downloadableTemplate);

                // Note - only one template can be downloaded at a time - check if download already in progress
                await WaitForDownloadAsync(siteService, site.Id, TestContext.Current.CancellationToken);

                var response = await siteService.DownloadTemplateAsync(site.Id, new DownloadTemplateDescriptor
                {
                    Digest = downloadableTemplate.Digest
                },
                TestContext.Current.CancellationToken);

                // Note - only one template can be downloaded at a time
                await WaitForDownloadAsync(siteService, site.Id, TestContext.Current.CancellationToken);
            }
        }
    }

    internal IPVEClientService CreatePVEClient(IServiceScope serviceScope, IConfigurationSection configurationSection)
    {
        var pveClientServiceOptions = configurationSection.Get<TokenPVEClientServiceOptions>();
        Assert.NotNull(pveClientServiceOptions);

        var pveClientFactory = serviceScope.ServiceProvider.GetRequiredService<IPVEClientFactory>();
        Assert.NotNull(pveClientFactory);

        var pveClient = pveClientFactory.Create(pveClientServiceOptions);
        Assert.NotNull(pveClient);
        return pveClient;
    }
}
