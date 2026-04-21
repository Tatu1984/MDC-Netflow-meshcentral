using AutoFixture;
using MDC.Core.Extensions;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Models;
using MDC.Shared.Tests;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit.Internal;

namespace MDC.Core.Tests;

public class BaseServicesTests : BaseSharedTests
{
    // All ServicesTests use Sqllite in-memory database
#pragma warning disable CS9107 // Parameter is captured into the state of the enclosing type and its value is also passed to the base constructor. The value might be captured by the base class as well.
    private class TestMDCDbContext(IConfiguration configuration, System.Data.Common.DbConnection connection, ITenantContext tenantContext) : MDCDbContext(configuration, tenantContext)
#pragma warning restore CS9107 // Parameter is captured into the state of the enclosing type and its value is also passed to the base constructor. The value might be captured by the base class as well.
    {
        // This is a test context that uses an in-memory database for testing purposes.
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (optionsBuilder.IsConfigured)
            {
                return;
            }
            optionsBuilder.UseSqlite(connection);
            optionsBuilder.AddInterceptors(new AuditInterceptor(tenantContext));
        }
    }

    /*
     * This method assembles the service collection and creates a service scope.
     */
    protected IServiceScope AssembleServicesTest(IServiceCollection serviceDescriptors, IConfiguration configuration, bool configureTestDatabase)
    {
        serviceDescriptors.AddLogging();

        if (configureTestDatabase)
            ConfigureTestDatabase(serviceDescriptors, configuration);

        // Add the Principal Accessor service if it is not added already. This mimics the Claims Principal of a User
        serviceDescriptors.TryAddScoped<ITenantContext>(sp => new TestMDCPrincipalAccessor
        {
            IsAuthenticated = true,
            IsPrivilegedUser = false,
            //IsGlobalAdministrator = true,
            //IsWorkspaceManager = true,
            ObjectId = Guid.NewGuid()
        });

        serviceDescriptors.AddMicroDatacenterCore(configuration);

        // Add any additional services required for the tests here.
        // TODO:
        //      If IOptions<PVEClientServiceOptions> is not registered, it will throw an exception when trying to resolve IPVEClientService.
        //      If Typed HttpClient for PVEClientServiceOptions is not registered, it will throw an exception when trying to resolve IPVEClientService.
        //      Add mocked services or use a test configuration to avoid these issues.

        IServiceScope serviceScope = AssembleSharedTest(serviceDescriptors);

        if (configureTestDatabase)
        {
            var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
            Assert.True(context.Database.IsSqlite(), "The database should be an in-memory SqLite database for testing purposes.");
            var created = context.Database.EnsureCreated();
            Assert.True(created);
        }

        return serviceScope;
    }

    private void ConfigureTestDatabase(IServiceCollection serviceDescriptors, IConfiguration configuration)
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        serviceDescriptors.AddSingleton<System.Data.Common.DbConnection>(connection);

        serviceDescriptors.AddDbContext<MDCDbContext, TestMDCDbContext>();
    }

    protected Fixture CreateFixture()
    {
        var fixture = new Fixture();
        fixture.Behaviors.OfType<ThrowingRecursionBehavior>().ToList()
            .ForEach(b => fixture.Behaviors.Remove(b));
        fixture.Behaviors.Add(new OmitOnRecursionBehavior());

        return fixture;
    }

    internal async Task<DbUser> CreateUserAsync(IServiceScope serviceScope)
    {
        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var tenantContext = serviceScope.ServiceProvider.GetRequiredService<ITenantContext>();
        Assert.NotNull(tenantContext.ObjectId);
        Assert.NotNull(tenantContext.User);
        Assert.NotNull(tenantContext.User.Identity);
        Assert.NotNull(tenantContext.User.Identity.Name);

        var dbUser = await dbContext.Users.AddAsync(new DbUser
        {
            Active = true,
            CreatedAt = DateTime.UtcNow,
            Id = tenantContext.ObjectId.Value,
            Name = tenantContext.User.Identity.Name,
            UpdatedAt = DateTime.UtcNow,
            Activities = new List<DbActivityLog>(),
            OrganizationUserRoles = new List<DbOrganizationUserRole>()
        }, TestContext.Current.CancellationToken);

        // Special case: When inserting self record, save then update - the ActivityLog cannot reference itself as user when inserting because the FK record has not been created yet.  The Update will handle the Audit log
        //if (tenantContext.ObjectId != null && tenantContext.ObjectId.Value == id)
        {
            await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);    // Insert
            dbUser.Entity.UpdatedAt = DateTime.UtcNow;
        }
        await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var allActivities = await dbContext.ActivityLog.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.Single(allActivities, a => a.EntityId == dbUser.Entity.Id && a.UserId == tenantContext.ObjectId.Value && a.Action == "Modified");

        return dbUser.Entity;
    }

    internal async Task<(DbUser, DbOrganization)> CreateUserAndOrganizationAsync(IServiceScope serviceScope)
    {
        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var fixture = CreateFixture();

        // Create User
        var dbUser = await CreateUserAsync(serviceScope);

        // Create Organization 
        var dbOrganization = await dbContext.Organizations.AddAsync(new DbOrganization
            {
                Name = fixture.Create<string>(),
                Description = fixture.Create<string>(),
                Active = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            TestContext.Current.CancellationToken);
        await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var dbOrganizationUserRole = new DbOrganizationUserRole
        {   UserId = dbUser.Id,
            Role = fixture.Create<string>(),
            OrganizationId = dbOrganization.Entity.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        dbOrganization.Entity.OrganizationUserRoles.Add(dbOrganizationUserRole);
        await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var allActivities = await dbContext.ActivityLog.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.Single(allActivities, a => a.EntityId == dbOrganization.Entity.Id && a.UserId == dbUser.Id && a.Action == "Added");
        Assert.Single(allActivities, a => a.EntityId == dbOrganizationUserRole.Id && a.UserId == dbUser.Id && a.Action == "Added");

        return (dbUser, dbOrganization.Entity);
    }

    internal async Task<DbSite> CreateSiteAsync(IServiceScope serviceScope, DbOrganization[] dbOrganizations)
    {
        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var fixture = CreateFixture();

        // Register Site
        var dbSite = await dbContext.Sites.AddAsync(fixture.Build<DbSite>()
            .Without(x => x.Workspaces)
            .Without(x => x.Organizations)
            .Without(x => x.SiteNodes)
            .Do(x => dbOrganizations.ForEach(y => x.Organizations.Add(y)))
            .Create(),
            TestContext.Current.CancellationToken);

        var dbSiteNode = await dbContext.SiteNodes.AddAsync(fixture.Build<DbSiteNode>()
            .Without(x => x.Site)
            .Without(x => x.SiteNodeRegistrations)
            .Without(x => x.MemberAddress)
            .Do(x => x.Site = dbSite.Entity)
            .Do(x => x.MemberAddress = Convert.ToHexString(Guid.NewGuid().ToByteArray().TakeLast(8).ToArray()))
            .Create(),
            TestContext.Current.CancellationToken);
        await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var tenantContext = serviceScope.ServiceProvider.GetRequiredService<ITenantContext>();
        Assert.NotNull(tenantContext.ObjectId);

        var allActivities = await dbContext.ActivityLog.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.Single(allActivities, a => a.EntityId == dbSite.Entity.Id && a.UserId == tenantContext.ObjectId.Value && a.Action == "Added");
        Assert.Single(allActivities, a => a.EntityId == dbSiteNode.Entity.Id && a.UserId == tenantContext.ObjectId.Value && a.Action == "Added");
        Assert.Single(allActivities, a => a.EntityName == "DbOrganizationDbSite" && a.UserId == tenantContext.ObjectId.Value && a.EntityId == null);
        return dbSite.Entity;
    }

    internal async Task<(DbWorkspace, DbVirtualNetwork)> CreateWorkspaceAsync(IServiceScope serviceScope, DbSite dbSite, DbOrganization dbOrganization)
    {
        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var fixture = CreateFixture();

        // Create Workspace(Site, Organization)
        // Note: Database Dontext does not enforce that the Organization is a member of the Site.Organizations
        var dbWorkspace = await dbContext.Workspaces.AddAsync(fixture.Build<DbWorkspace>()
            .Without(x => x.Site)
            .Without(x => x.VirtualNetworks)
            .Without(x => x.Organization)
            .Do(x => x.Site = dbSite)
            .Do(x => x.Organization = dbOrganization)
            .Create(),
            TestContext.Current.CancellationToken);

        var dbVirtualNetwork = await dbContext.VirtualNetworks.AddAsync(fixture.Build<DbVirtualNetwork>()
            .Without(x => x.Workspace)
            .Without(x => x.ZeroTierNetworkId)
            .Do(x => x.Workspace = dbWorkspace.Entity)
            .Create(),
            TestContext.Current.CancellationToken);
        await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var tenantContext = serviceScope.ServiceProvider.GetRequiredService<ITenantContext>();
        Assert.NotNull(tenantContext.ObjectId);

        var allActivities = await dbContext.ActivityLog.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.Single(allActivities, a => a.EntityId == dbWorkspace.Entity.Id && a.UserId == tenantContext.ObjectId.Value && a.Action == "Added");
        Assert.Single(allActivities, a => a.EntityId == dbVirtualNetwork.Entity.Id && a.UserId == tenantContext.ObjectId.Value && a.Action == "Added");

        return (dbWorkspace.Entity, dbVirtualNetwork.Entity);
    }

    internal async Task<(DbUser, DbOrganization, DbSite, DbWorkspace, DbVirtualNetwork)> PopulateDatabaseAsync(IServiceScope serviceScope)
    {
        var (dbUser, dbOrganization) = await CreateUserAndOrganizationAsync(serviceScope);
        var dbSite = await CreateSiteAsync(serviceScope, [dbOrganization]);
        var (dbWorkspace, dbVirtualNetwork) = await CreateWorkspaceAsync(serviceScope, dbSite, dbOrganization);

        return (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork);
    }

    internal void CompareSite(DbSite dbSite, Site site)
    {
        Assert.Equal(dbSite.Id, site.Id);
        Assert.Equal(dbSite.Name, site.Name);
        Assert.Equal(dbSite.Description, site.Description);
        Assert.Equal(dbSite.ApiSecret, site.ApiSecret);
        Assert.Equal(dbSite.ApiTokenId, site.ApiTokenId);
        
        if (site.Workspaces != null)
        {
            Assert.Single(site.Workspaces);
            CompareWorkspace(dbSite.Workspaces.Single(), site.Workspaces.Single());
        }

        if (site.Organizations != null)
        {
            Assert.Single(site.Organizations);
            CompareOrganization(dbSite.Organizations.Single(), site.Organizations.Single());
        }

        Assert.Single(site.SiteNodes);
        CompareSiteNode(dbSite.SiteNodes.Single(), site.SiteNodes.Single());
    }

    internal void CompareWorkspace(DbWorkspace dbWorkspace, Workspace workspace)
    {
        Assert.Equal(dbWorkspace.Id, workspace.Id);
        Assert.Equal(dbWorkspace.Address, workspace.Address);
        Assert.Equal(dbWorkspace.Name, workspace.Name);
        Assert.Equal(dbWorkspace.Description, workspace.Description);
        Assert.Equal(dbWorkspace.Locked, workspace.Locked);
        //Assert.NotNull(workspace.Site);
        //Assert.Equal(dbWorkspace.SiteId, workspace.Site.Id);
    }

    internal void CompareOrganization(DbOrganization dbOrganization, Organization organization)
    {
        Assert.Equal(dbOrganization.Id, organization.Id);
        Assert.Equal(dbOrganization.Name, organization.Name);
        Assert.Equal(dbOrganization.Active, organization.Active);
    }

    internal void CompareSiteNode(DbSiteNode dbSiteNode, SiteNode siteNode)
    {

    }
}
