using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Tests;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

/*  These tests requires the following user secrets to be set up in the MDC.IntegrationTests project.
 {
    "ConnectionStrings": {
      "DefaultConnection": "Host=<applicaion server address>;Port=5432;Database=MDC;Username=postgres;Password=SDNlab123"
    }
  }
*/

namespace MDC.Integration.Tests.Services.Providers;

public class MDCDatabaseServiceIntegrationTests : BaseIntegrationTests
{
    [Fact]
    public void ConfigurationTest()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();
        Assert.NotNull(service);
    }

    //[Fact(Skip = "Alters Database")]
    [Fact]
    public async Task MigrateDatabase()
    {
        // Arrange
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        var service = serviceScope.ServiceProvider.GetRequiredService<IDatabaseMigrationService>();
        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        Assert.True(dbContext.Database.IsNpgsql(), "The database should be a PostgreSQL database for testing purposes.");

        // NOTE:   Manaual Intervention is needed after dropping the FK and adding new FK for DbSiteNodes.Id
        //      UPDATE public."SiteNodes" SET "Id" = gen_random_uuid()
        //var dbSiteNodes = await dbContext.SiteNodes
        //    .IgnoreQueryFilters()
        //    .AsNoTracking()
        //    .ToArrayAsync(TestContext.Current.CancellationToken);

        // Act
        //var migrations = await service.GetPendingMigrationsAsync(TestContext.Current.CancellationToken);
        //Assert.NotNull(migrations);
        var success = await service.MigrateAsync(TestContext.Current.CancellationToken);

        //var dbSiteNodes1 = await dbContext.SiteNodes
        //    .IgnoreQueryFilters()
        //    .AsNoTracking()
        //    .ToArrayAsync(TestContext.Current.CancellationToken);

        //if (success)
        //{
        //    foreach (var i in dbSiteNodes)
        //        i.Id = Guid.NewGuid();
        //    await dbContext.SiteNodes.AddRangeAsync(dbSiteNodes, TestContext.Current.CancellationToken);
        //    await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        //}

        // Assert.True(success);



        // Assert
        //var sites = await context.Sites.ToListAsync(TestContext.Current.CancellationToken);
        // Assert.Empty(datacenters);
    }

    [Fact]
    public async Task GetSitesAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var sites = await context.Sites.ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(sites);
    }

    [Fact]
    public async Task GetSiteNodesAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();

        var siteNodes = await dbContext.SiteNodes
            .Include(i => i.SiteNodeRegistrations)
            .ToArrayAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(siteNodes);
    }

    //[Theory]
    //[ClassData(typeof(TheoryConfigurationKeys))]
    //public async Task CreateDatacenterAsync_ShouldCreateRecord(string theoryConfigurationKey)
    //{
    //    var datacenterName = "TestDatacenter";
    //    var datacenterDescription = "This is a test datacenter.";

    //    // Arrange
    //    IServiceCollection serviceDescriptors = new ServiceCollection();
    //    using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfigurationKey);
    //    var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();
    //    var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
    //    Assert.True(context.Database.IsNpgsql(), "The database should be a PostgreSQL database for testing purposes.");

    //    await service.RecreateDatabaseAsync();

    //    // Act
    //    var datacenter = await service.CreateDatacenterAsync(datacenterName, datacenterDescription);
    //    Assert.NotNull(datacenter);
    //    Assert.Equal(datacenterName, datacenter.Name);
    //    Assert.Equal(datacenterDescription, datacenter.Description);
    //    Assert.NotEqual(Guid.Empty, datacenter.Id);
    //    Assert.NotEqual(DateTime.MinValue, datacenter.CreatedAt);
    //    Assert.NotEqual(DateTime.MinValue, datacenter.UpdatedAt);

    //    // Assert
    //    var datacenters = await context.Datacenters.ToListAsync();
    //    Assert.Single(datacenters);
    //    Assert.Equal(datacenterName, datacenters[0].Name);
    //    Assert.Equal(datacenterDescription, datacenters[0].Description);
    //    Assert.Equal(datacenter.Id, datacenters[0].Id);
    //    Assert.NotEqual(DateTime.MinValue, datacenters[0].CreatedAt);
    //    Assert.NotEqual(DateTime.MinValue, datacenters[0].UpdatedAt);
    //    Assert.Equal(datacenters[0].CreatedAt, datacenters[0].UpdatedAt);
    //}

    //[Theory]
    //[ClassData(typeof(TheoryConfigurationKeys))]
    //public async Task ImportWorkspacesAsync_ShouldCreateRecords(string theoryConfigurationKey)
    //{
    //    var datacenterName = "TestDatacenter";
    //    var datacenterDescription = "This is a test datacenter.";
    //    // Arrange
    //    IServiceCollection serviceDescriptors = new ServiceCollection();
    //    using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfigurationKey);
    //    var service = serviceScope.ServiceProvider.GetRequiredService<IMDCDatabaseService>();
    //    var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
    //    Assert.True(context.Database.IsNpgsql(), "The database should be a PostgreSQL database for testing purposes.");

    //    await service.RecreateDatabaseAsync();
    //    var datacenter = await service.CreateDatacenterAsync(datacenterName, datacenterDescription);
    //    Assert.NotNull(datacenter);

    //    // Act
    //    var workspaces = await service.ImportWorkspacesAsync(datacenter.Id, new[]
    //    {
    //        new Core.Models.WorkspaceEntry
    //        {
    //            Address = 100
    //        }
    //    });

    //    // Assert
    //    var dbWorkspaces = await context.Workspaces.ToArrayAsync();
    //    Assert.Single(dbWorkspaces);
    //    Assert.Equal(datacenter.Id, dbWorkspaces[0].DatacenterId);
    //    Assert.Equal(100, dbWorkspaces[0].Address);
    //    Assert.NotEqual(Guid.Empty, dbWorkspaces[0].Id);
    //    Assert.NotEqual(DateTime.MinValue, dbWorkspaces[0].CreatedAt);
    //    Assert.NotEqual(DateTime.MinValue, dbWorkspaces[0].UpdatedAt);
    //    Assert.Equal(dbWorkspaces[0].CreatedAt, dbWorkspaces[0].UpdatedAt);

    //}
}
