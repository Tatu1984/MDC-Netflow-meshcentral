using AutoFixture;
using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Core.Tests.Services.Api;

public class WorkspaceServiceTests : BaseMDCCoreTests
{
    internal IServiceScope AssembleWorkspaceServiceTest()
    {
        return AssembleBaseMDCCoreTests();
    }

    private void CompareWorkspaceDescriptor(WorkspaceDescriptor expected, WorkspaceDescriptor actual)
    {
        Assert.Equal(expected.Name, actual.Name);
        Assert.Equal(expected.Description, actual.Description);
        Assert.Equal(expected.VirtualMachines?.Count(), actual.VirtualMachines?.Count());

    }

    [Fact]
    public async Task NoWorkspaces_GetAllAsync()
    {
        using var serviceScope = AssembleWorkspaceServiceTest();
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        var sites = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Empty(sites);
    }

    [Fact]
    public async Task SingleWorkspace_GetAll()
    {
        using var serviceScope = AssembleWorkspaceServiceTest();
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        var (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork) = await PopulateDatabaseAsync(serviceScope);
        PopulateMocksForSite(dbSite);

        var workspaces = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Single(workspaces);
        
        var workspace = workspaces.Single();
        this.CompareWorkspace(dbWorkspace, workspace);

        var singleWorkspace = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(singleWorkspace);
        this.CompareWorkspace(dbWorkspace, workspace);
    }

    [Fact]
    public async Task CreateWorkspaceSimple_Aync()
    {
        using var serviceScope = AssembleWorkspaceServiceTest();
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        var fixture = new Fixture();

        // var files = Directory.GetFiles(Path.Combine("..", "..", "..", "..", "MDC.Integration.Tests", "Content", "WorkspaceDescriptors"));
        var (dbUser, dbOrganization) = await CreateUserAndOrganizationAsync(serviceScope);
        var dbSite = await CreateSiteAsync(serviceScope, [dbOrganization]);
        PopulateMocksForSite(dbSite);

        var workspaceDescriptor = new WorkspaceDescriptor
        {
            Name = fixture.Create<string>(),
            Description = fixture.Create<string>(),
        };
        var workspaceSimple = await workspaceService.CreateAsync(new CreateWorkspaceParameters
        {
            SiteId = dbSite.Id,
            OrganizationId = dbOrganization.Id,
            Descriptor = workspaceDescriptor
        }, TestContext.Current.CancellationToken);

        var workspaces = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Single(workspaces);
        var workspace = workspaces.Single();

        var dbContext= serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var dbWorkspace = await dbContext.Workspaces.AsNoTracking().SingleAsync(i => i.Id == workspace.Id, TestContext.Current.CancellationToken);
        this.CompareWorkspace(dbWorkspace,workspace);

        var singleWorkspace = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(singleWorkspace);
        this.CompareWorkspace(dbWorkspace, singleWorkspace);

        var actualDescriptor = await workspaceService.GetWorkspaceDescriptorAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(actualDescriptor);

        CompareWorkspaceDescriptor(workspaceDescriptor, actualDescriptor);
    }

    [Fact]
    public async Task CreateWorkspaceSimple_ClusterSite_Aync()
    {
        using var serviceScope = AssembleWorkspaceServiceTest();
        var workspaceService = serviceScope.ServiceProvider.GetRequiredService<IWorkspaceService>();

        var fixture = new Fixture();

        // var files = Directory.GetFiles(Path.Combine("..", "..", "..", "..", "MDC.Integration.Tests", "Content", "WorkspaceDescriptors"));
        var (dbUser, dbOrganization) = await CreateUserAndOrganizationAsync(serviceScope);
        var dbSite = await CreateSiteAsync(serviceScope, [dbOrganization]);

        // Create additional SiteNode for the Site
        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var numAdditionalNodes = 2;
        for (var x = 0;x<numAdditionalNodes;x++)
        {
            var dbSiteNode = await dbContext.SiteNodes.AddAsync(fixture.Build<DbSiteNode>()
            .Without(x => x.Site)
            .Without(x => x.SiteNodeRegistrations)
            .Without(x => x.MemberAddress)
            .Do(x => x.Site = dbSite)
            .Do(x => x.MemberAddress = Convert.ToHexString(Guid.NewGuid().ToByteArray().TakeLast(8).ToArray()))
            .Create(),
            TestContext.Current.CancellationToken);
        }
        await dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        PopulateMocksForSite(dbSite);

        var workspaceDescriptor = new WorkspaceDescriptor
        {
            Name = fixture.Create<string>(),
            Description = fixture.Create<string>(),
        };
        var workspaceSimple = await workspaceService.CreateAsync(new CreateWorkspaceParameters
        {
            SiteId = dbSite.Id,
            OrganizationId = dbOrganization.Id,
            Descriptor = workspaceDescriptor
        }, TestContext.Current.CancellationToken);

        var workspaces = await workspaceService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Single(workspaces);
        var workspace = workspaces.Single();
        
        var dbWorkspace = await dbContext.Workspaces.AsNoTracking().SingleAsync(i => i.Id == workspace.Id, TestContext.Current.CancellationToken);
        this.CompareWorkspace(dbWorkspace, workspace);

        var singleWorkspace = await workspaceService.GetByIdAsync(workspace.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(singleWorkspace);
        this.CompareWorkspace(dbWorkspace, singleWorkspace);
    }
}
