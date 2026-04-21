using AutoFixture;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Core.Tests.Services.Providers.MDCDatabase;

public class MDCDatabaseServiceTests : BaseMDCCoreTests
{
    protected IServiceScope AssembleMDCDatabaseServiceTest()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();

        IServiceScope serviceScope = AssembleServicesTest(serviceDescriptors, new ConfigurationManager(), true);

        return serviceScope;
    }

    [Fact]
    public async Task ValidateSchema_PopulateDatabaseAsync()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork) = await PopulateDatabaseAsync(serviceScope);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var fixture = CreateFixture();

        // Act
        var dbSiteNodeRegistration = await dbContext.SiteNodeRegistrations.AddAsync(fixture.Build<DbSiteNodeRegistration>()
            .Without(i => i.SiteNode)
            .Without(i => i.MemberAddress)
            .Do(i => i.SiteNode = dbSite.SiteNodes.First())
            .Create(),
            TestContext.Current.CancellationToken);
        await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Assert
        var actualSiteNodeRegistration = await dbContext.SiteNodeRegistrations.SingleAsync(TestContext.Current.CancellationToken);

        // Verify Activity Log
        var allActivities = await dbContext.ActivityLog.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.Single(allActivities, a => a.EntityId == actualSiteNodeRegistration.Id);
    }

    [Fact]
    public async Task Verify_CreateOrganizationAsync()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var dbUser = await CreateUserAsync(serviceScope);
        RunAsPrivilegedUser(serviceScope);

        var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();
        
        var userRoles = new string[] { "User" };
        var fixture = CreateFixture();

        // Act
        // Create Organization       
        var dbOrganization = await service.CreateOrganizationAsync(new OrganizationDescriptor
        {
            Name = fixture.Create<string>(),
            SiteIds = Array.Empty<Guid>(),
            OrganizationUserRoles = userRoles.Select(role => new OrganizationUserRoleDescriptor { Role = role, UserId = dbUser.Id }).ToArray(),
        }, TestContext.Current.CancellationToken);
        Assert.NotEqual(Guid.NewGuid(), dbOrganization.Id);
        Assert.True(dbOrganization.Active);
        foreach (var role in userRoles)
        {
            Assert.Single(dbOrganization.OrganizationUserRoles, our => our.UserId == dbUser.Id && our.Role == role);
        }

        foreach (var role in userRoles ?? [])
        {
            Assert.Contains(dbUser.OrganizationUserRoles, i => i.Role == role && i.UserId == dbUser.Id && i.OrganizationId == dbOrganization.Id);
        }
    }


    //[Fact]
    //public async Task Create_Organization_MustHaveAtLeastOneUserRoleAsync()
    //{
    //    // Arrange
    //    using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
    //    var dbUser = await CreateUserAsync(serviceScope);

    //    var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

    //    var fixture = CreateFixture();

    //    // Act
    //    // Create Organization
    //    // This should fail because the Organization Descriptor has no usersis not a member of the Site
    //    await Assert.ThrowsAsync<InvalidOperationException>(async () =>
    //    {
    //        await service.CreateOrganizationAsync(new OrganizationDescriptor
    //        {
    //            Name = fixture.Create<string>(),
    //            SiteIds = Array.Empty<Guid>(),
    //            OrganizationUserRoles = null
    //        }, TestContext.Current.CancellationToken);
    //    }, i => i.Message != "Organization must have at least one User Role Assignment" ? i.Message : null);
    //}

    [Fact]
    public async Task RegisterSiteAsync()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var dbUser = await CreateUserAsync(serviceScope);
        RunAsPrivilegedUser(serviceScope);

        var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        var siteNodePort = 8006;
        var validateServerCertificate = false;
        var fixture = CreateFixture();

        // Act
        // Create Organization
        var dbOrganization = await service.CreateOrganizationAsync(new OrganizationDescriptor
        {
            Name = fixture.Create<string>(),
            SiteIds = Array.Empty<Guid>(),
            OrganizationUserRoles = [new OrganizationUserRoleDescriptor { Role = "Owner", UserId = dbUser.Id }]
        }, TestContext.Current.CancellationToken);
        Assert.NotEqual(Guid.NewGuid(), dbOrganization.Id);
        Assert.True(dbOrganization.Active);
        Assert.Single(dbOrganization.OrganizationUserRoles);

        // Register Site
        var dbSite = await service.CreateSiteAsync(fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), TestContext.Current.CancellationToken);
        Assert.NotEqual(Guid.Empty, dbSite.Id);
        Assert.NotEmpty(dbSite.Name);
        Assert.NotEmpty(dbSite.Description);
        Assert.NotEmpty(dbSite.ApiSecret);
        Assert.NotEmpty(dbSite.ApiTokenId);
        Assert.Empty(dbSite.SiteNodes);
        Assert.Empty(dbSite.Organizations);
        Assert.Empty(dbSite.Workspaces);

        dbSite = await service.UpdateSiteAsync(dbSite.Id, null, null, null, null, [dbOrganization.Id], null, TestContext.Current.CancellationToken);
        Assert.NotEmpty(dbSite.Organizations);

        var dbSiteNode = await service.CreateSiteNodeAsync(dbSite.Id, fixture.Create<Guid>(), fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), siteNodePort, validateServerCertificate, TestContext.Current.CancellationToken);
        Assert.Equal(dbSite.Id, dbSiteNode.SiteId);
        Assert.NotEmpty(dbSiteNode.Name);
        Assert.NotEmpty(dbSiteNode.MemberAddress);
        Assert.Equal(siteNodePort, dbSiteNode.ApiPort);
        Assert.Equal(validateServerCertificate, dbSiteNode.ApiValidateServerCertificate);

        var dbSites = service.GetAllSites();
        Assert.NotEmpty(dbSites);
        Assert.Contains(dbSite.Id, dbSites.Select(i => i.Id));
    }

    [Fact]
    public async Task Verify_CreateWorkspaceAsync()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        //var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        //var fixture = CreateFixture();
        //var siteNodePort = 8006;
        //var validateServerCertificate = false;
        //var virtualNetworkNames = new string[] { fixture.Create<string>() };

        // Act
        var (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork) = await PopulateDatabaseAsync(serviceScope);

        //// Register Site
        //var dbSite = await service.CreateSiteAsync(fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), TestContext.Current.CancellationToken);
        //var dbSiteNode = await service.CreateSiteNodeAsync(dbSite.Id, fixture.Create<string>(), fixture.Create<string>(), siteNodePort, validateServerCertificate, TestContext.Current.CancellationToken);

        //// Add Organization to Site
        //dbSite = await service.UpdateSiteAsync(dbSite.Id, null, null, null, [dbOrganization.Id], TestContext.Current.CancellationToken);
        //Assert.Contains(dbOrganization.Sites, i => i.Id == dbSite.Id);

        ////// Add Organization to Site
        ////dbOrganization = await service.UpdateOrganizationAsync(dbOrganization.Id, null, new[] { dbSite.Id }, Array.Empty<Guid>(), TestContext.Current.CancellationToken);
        ////Assert.Contains(dbOrganization.Sites, i => i.Id == dbSite.Id);

        //// Create Workspace(Site, Organization)
        //var dbWorkspace = await service.CreateWorkspaceAsync(dbSite.Id, dbOrganization.Id, fixture.Create<string>(), fixture.Create<string>(), virtualNetworkNames, new DatacenterSettings(), TestContext.Current.CancellationToken);

        Assert.NotEqual(Guid.Empty, dbWorkspace.Id);
        Assert.NotEqual(0, dbWorkspace.Address);
        Assert.Equal(dbSite.Id, dbWorkspace.SiteId);
        Assert.Equal(dbOrganization.Id, dbWorkspace.OrganizationId);
        Assert.NotEmpty(dbWorkspace.Name);
        Assert.NotNull(dbWorkspace.Description);
        Assert.NotEmpty(dbWorkspace.Description);
        Assert.NotNull(dbWorkspace.Status);
        Assert.NotEmpty(dbWorkspace.VirtualNetworks);
        Assert.Single(dbWorkspace.VirtualNetworks);
        Assert.Contains(dbWorkspace.VirtualNetworks, i => i.Name == dbVirtualNetwork.Name);

        foreach (var vnet in dbWorkspace.VirtualNetworks)
        {
            Assert.NotEmpty(vnet.Name);
            Assert.Equal(dbWorkspace.Id, vnet.WorkspaceId);
        }
    }

    [Fact]
    public async Task CreateWorkspace_SplitOrganization_Fail_Async()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var (dbUser, dbOrganization) = await CreateUserAndOrganizationAsync(serviceScope);
        RunAsPrivilegedUser(serviceScope);

        var databaseService = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        var fixture = CreateFixture();
        var siteNodePort = 8006;
        var validateServerCertificate = false;
        var virtualNetworkNames = new string[] { fixture.Create<string>() };

        // Act
        var dbOrganization1 = await databaseService.CreateOrganizationAsync(new OrganizationDescriptor
        {
            Name = fixture.Create<string>(),
            SiteIds = Array.Empty<Guid>(),
            OrganizationUserRoles = [new OrganizationUserRoleDescriptor { Role = "Owner", UserId = dbUser.Id }]
        }, TestContext.Current.CancellationToken);
        Assert.NotEqual(dbOrganization.Id, dbOrganization1.Id);

        // Register Site
        var dbSite = await databaseService.CreateSiteAsync(fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), TestContext.Current.CancellationToken);
        var dbSiteNode = await databaseService.CreateSiteNodeAsync(dbSite.Id, fixture.Create<Guid>(), fixture.Create<string>(), fixture.Create<string>(), fixture.Create<string>(), siteNodePort, validateServerCertificate, TestContext.Current.CancellationToken);
        dbSite = await databaseService.UpdateSiteAsync(dbSite.Id, null, null, null, null, [dbOrganization.Id], null, TestContext.Current.CancellationToken);

        // Create Workspace(Site, Organization)
        // This should fail because the Organization is not a member of the Site
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await databaseService.CreateWorkspaceAsync(dbSite.Id, dbOrganization1.Id, fixture.Create<string>(), fixture.Create<string>(), virtualNetworkNames, new DatacenterSettings(), TestContext.Current.CancellationToken);
        }, i => i.Message != "Organization is not a member of Site." ? i.Message : null);
    }

    [Fact]
    public async Task SoftDelete_DbWorkspace_Async()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork) = await PopulateDatabaseAsync(serviceScope);

        var databaseService = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        {
            var workspaces = await databaseService.GetAllWorkspaces().ToListAsync(TestContext.Current.CancellationToken);
            Assert.Single(workspaces);
        }

        // Act
        await databaseService.DeleteWorkspaceAsync(dbWorkspace.Id, TestContext.Current.CancellationToken);

        // Assert
        {
            var workspaces = await databaseService.GetAllWorkspaces().ToListAsync(TestContext.Current.CancellationToken);
            Assert.Empty(workspaces);
        }
    }

    [Fact]
    public async Task SoftDelete_DbOrganization_FailWithWorkspace_Async()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork) = await PopulateDatabaseAsync(serviceScope);

        var databaseService = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        {
            var organizations = await databaseService.GetAllOrganizations().ToListAsync(TestContext.Current.CancellationToken);
            Assert.Single(organizations);
        }

        // Act
        // This should fail because the Organization has a Workspace
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await databaseService.RemoveOrganizationAsync(dbOrganization.Id, TestContext.Current.CancellationToken);
        }, i => !i.Message.StartsWith("Remove all Workspaces from Organization Id") ? i.Message : null);

        // Assert
        {
            var organizations = await databaseService.GetAllOrganizations().ToListAsync(TestContext.Current.CancellationToken);
        }
    }

    [Fact]
    public async Task SoftDelete_DbOrganization_Async()
    {
        // Arrange
        using IServiceScope serviceScope = AssembleMDCDatabaseServiceTest();
        var (dbUser, dbOrganization) = await CreateUserAndOrganizationAsync(serviceScope);
        var dbSite = await CreateSiteAsync(serviceScope, [dbOrganization]);

        var databaseService = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();

        {
            var organizations = await databaseService.GetAllOrganizations().ToListAsync(TestContext.Current.CancellationToken);
            Assert.Single(organizations);
        }

        // Act
        await databaseService.RemoveOrganizationAsync(dbOrganization.Id, TestContext.Current.CancellationToken);

        // Assert
        {
            var organizations = await databaseService.GetAllOrganizations().ToListAsync(TestContext.Current.CancellationToken);
        }
    }
}
