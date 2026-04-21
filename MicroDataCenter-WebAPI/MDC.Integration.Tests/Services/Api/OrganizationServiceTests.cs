using MDC.Core.Services.Api;
using MDC.Core.Tests;
using MDC.Shared.Models;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Integration.Tests.Services.Api;

public class OrganizationServiceTests : BaseIntegrationTests
{
    private async Task CleanupAsync(IServiceScope serviceScope)
    {
        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();
        Assert.NotNull(organizationService);

        var organizations = (await organizationService.GetAllAsync(TestContext.Current.CancellationToken)).Where(i => i.Name == DefaultOrganization).ToList();
        Assert.NotNull(organizations);

        foreach (var organization in organizations)
        {
            // If the organization has any Workpsaces, then there is a different Unit test that was not cleaned up and this test cannot proceed.  The Workspace needs to be removed first.
            Assert.NotNull(organization.Workspaces);
            Assert.Empty(organization.Workspaces);

            await organizationService.DeleteAsync(organization.Id, TestContext.Current.CancellationToken);
        }
    }

    [Fact]
    public void GetOrganizationService()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();
        Assert.NotNull(service);
        Assert.IsType<OrganizationService>(service);
    }

    [Fact]
    public async Task GetAllAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();
        Assert.NotNull(organizationService);

        var organizations = (await organizationService.GetAllAsync(TestContext.Current.CancellationToken)).ToList();
        Assert.NotNull(organizations);
        Assert.NotEmpty(organizations);

        foreach (var organization in organizations)
        {
            var detail = await organizationService.GetByIdAsync(organization.Id, TestContext.Current.CancellationToken);
        }
    }

    [Fact]
    public async Task Create_Organization_MultipleSitesAsync()
    {
        int numSites = 2;

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();
        Assert.NotNull(organizationService);
        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);

        await CleanupAsync(serviceScope);

        var sites = (await siteService.GetAllAsync(TestContext.Current.CancellationToken)).OrderBy(i => i.Name).ToList();
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        // Select Sites which will be assigned to the Organization
        var targetSites = sites.Take(numSites).ToList();
        Assert.NotNull(targetSites);

        var organization = await organizationService.CreateAsync(new OrganizationDescriptor
        {
            Name = DefaultOrganization,
            SiteIds = targetSites.Select(i => i.Id).ToArray()
        }, TestContext.Current.CancellationToken);
        Assert.NotNull(organization);
        Assert.NotNull(organization.Sites);

        // Assert.True(updatedOrganization.Sites?.Any(i => i.Id == targetSite.Id));
        Assert.True(targetSites.All(i => organization.Sites.Any(j => j.Id == i.Id)));

        // Check that Site is assigned to Organization
        organization = await organizationService.GetByIdAsync(organization.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(organization);
        Assert.NotNull(organization.Sites);
        Assert.True(targetSites.All(i => organization.Sites.Any(j => j.Id == i.Id)));

        await CleanupAsync(serviceScope);
    }

    [Fact]
    public async Task Update_Organization_AddSiteAsync()
    {
        int numSites = 2;

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();
        Assert.NotNull(organizationService);
        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        Assert.NotNull(siteService);

        await CleanupAsync(serviceScope);

        var organization = await organizationService.CreateAsync(new OrganizationDescriptor
        {
            Name = DefaultOrganization
        }, TestContext.Current.CancellationToken);
        Assert.NotNull(organization);

        var sites = (await siteService.GetAllAsync(TestContext.Current.CancellationToken)).OrderBy(i => i.Name).ToList();
        Assert.NotNull(sites);
        Assert.NotEmpty(sites);

        // Select Sites which will be assigned to the Organization
        var targetSites = sites.Take(numSites).ToList();
        Assert.NotNull(targetSites);


        // Assign Sites to Organization
        var updatedOrganization = await organizationService.UpdateAsync(organization.Id, new OrganizationUpdateDescriptor
        {
            AddSiteIds = targetSites.Select(i => i.Id).ToArray()
        }, TestContext.Current.CancellationToken);
        Assert.NotNull(updatedOrganization);
        Assert.NotNull(updatedOrganization.Sites);

        // Assert.True(updatedOrganization.Sites?.Any(i => i.Id == targetSite.Id));
        Assert.True(targetSites.All(i => updatedOrganization.Sites.Any(j => j.Id == i.Id)));

        // Check that Site is assigned to Organization
        organization = await organizationService.GetByIdAsync(organization.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(organization);
        Assert.NotNull(organization.Sites);
        Assert.True(targetSites.All(i => organization.Sites.Any(j => j.Id == i.Id)));

        await CleanupAsync(serviceScope);
    }

    //[Fact]
    //public async Task Update_Organization_AddRemoveUserAsync()
    //{
    //    int numSites = 2;

    //    IServiceCollection serviceDescriptors = new ServiceCollection();
    //    using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
    //    RunAsPrivileged(serviceScope);

    //    var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();
    //    Assert.NotNull(organizationService);
    //    var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
    //    Assert.NotNull(siteService);

    //    await CleanupAsync(serviceScope);

    //    var organization = await organizationService.CreateAsync(new OrganizationDescriptor
    //    {
    //        Name = DefaultOrganization
    //    }, TestContext.Current.CancellationToken);
    //    Assert.NotNull(organization);

    //    var sites = (await siteService.GetAllAsync(TestContext.Current.CancellationToken)).OrderBy(i => i.Name).ToList();
    //    Assert.NotNull(sites);
    //    Assert.NotEmpty(sites);

    //    // Select Sites which will be assigned to the Organization
    //    var targetSites = sites.Take(numSites).ToList();
    //    Assert.NotNull(targetSites);


    //    // Assign Sites to Organization
    //    var updatedOrganization = await organizationService.UpdateAsync(organization.Id, new OrganizationUpdateDescriptor
    //    {
    //        AddSiteIds = targetSites.Select(i => i.Id).ToArray()
    //    }, TestContext.Current.CancellationToken);
    //    Assert.NotNull(updatedOrganization);
    //    Assert.NotNull(updatedOrganization.Sites);

    //    // Assert.True(updatedOrganization.Sites?.Any(i => i.Id == targetSite.Id));
    //    Assert.True(targetSites.All(i => updatedOrganization.Sites.Any(j => j.Id == i.Id)));

    //    // Check that Site is assigned to Organization
    //    organization = await organizationService.GetByIdAsync(organization.Id, TestContext.Current.CancellationToken);
    //    Assert.NotNull(organization);
    //    Assert.NotNull(organization.Sites);
    //    Assert.True(targetSites.All(i => organization.Sites.Any(j => j.Id == i.Id)));

    //    await CleanupAsync(serviceScope);
    //}
}
