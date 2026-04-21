using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Integration.Tests.Services.Api;

public class SiteServiceTests : BaseIntegrationTests
{
    private async Task CompareSite(IServiceScope serviceScope, Guid expectedSiteId, Site actualSite)
    {
        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var dbSite = await dbContext.Sites
                .Include(s => s.Organizations)
                .Include(s => s.SiteNodes)
                .Include(s => s.Workspaces)
                .FirstOrDefaultAsync(s => s.Id == expectedSiteId, TestContext.Current.CancellationToken);
        Assert.NotNull(dbSite);

        Assert.Equal(dbSite.Name, actualSite.Name);
        Assert.Equal(dbSite.Description, actualSite.Description);
        // Assert.Equal(dbSite.SiteNodes.Select(i => i.Name).Order(), actualSite.Nodes.Where(i => i.Registered != null).Select(i => i.Name).Order());
        Assert.Equal(dbSite.SiteNodes.Select(i => i.Name).Order(), actualSite.SiteNodes.Select(i => i.Name).Order());
        Assert.Equal(dbSite.Organizations.Select(i => i.Id).Order(), actualSite?.Organizations?.Select(i => i.Id).Order());
        Assert.Equal(dbSite.Workspaces.Select(i => i.Id).Order(), actualSite?.Workspaces?.Select(i => i.Id).Order());

        foreach (var siteNode in actualSite?.SiteNodes ?? [])
        {
            await CompareSiteNode(serviceScope, dbSite.SiteNodes.Single(i => i.Id == siteNode.Id), siteNode);
        }
    }

    private async Task CompareSiteNode(IServiceScope serviceScope, DbSiteNode dbSiteNode, SiteNode actualSiteNode)
    {
        Assert.Equal(dbSiteNode.Name, actualSiteNode.Name);
        if (actualSiteNode.HostName != null)
        {
            Assert.NotNull(actualSiteNode.CPUInfo);
        }
    }

    [Fact]
    public void GetSiteService()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);
    }

    [Fact]
    public async Task GetAllAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);

        var sites = (await service.GetAllAsync(TestContext.Current.CancellationToken)).ToList();
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        foreach (var site in sites)
        {
            await CompareSite(serviceScope, site.Id, site);
        }
    }

    [Fact]
    public async Task GetSiteByIdAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);
        Assert.IsType<SiteService>(siteService);

        var sites = await siteService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        foreach (var _site in sites)
        {
            // Act
            var site = await siteService.GetByIdAsync(_site.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(site);

            // Assert
            await CompareSite(serviceScope, site.Id, site);
        }
    }

    [Fact]
    public async Task GetSiteByNameAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(service);
        Assert.IsType<SiteService>(service);

        var sites = await service.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        foreach (var _site in sites)
        {
            // Act
            var site = await service.GetByIdAsync(_site.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(site);
            Assert.Equal(_site.Id, site.Id);

            // Assert
            await CompareSite(serviceScope, site.Id, site);
        }
    }
}
