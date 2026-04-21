using AutoFixture;
using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Core.Tests.Services.Api;

public class OrganizationServiceTests : BaseMDCCoreTests
{
    internal IServiceScope AssembleOrganizationServiceTest()
    {
        return AssembleBaseMDCCoreTests();
    }

    [Fact]
    public async Task NoOrganizations_GetAllAsync()
    {
        using var serviceScope = AssembleOrganizationServiceTest();
        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();

        var organizations = await organizationService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Empty(organizations);
    }

    [Fact]
    public async Task SingleOrganization_GetAll()
    {
        using var serviceScope = AssembleOrganizationServiceTest();
        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();

        var (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork) = await PopulateDatabaseAsync(serviceScope);

        var organizations = await organizationService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Single(organizations);
        var organization = organizations.Single();
        CompareOrganization(dbOrganization, organization);

        {
            Assert.NotNull(organization.Name);
            Assert.NotEmpty(organization.Name);
            Assert.True(organization.Active);
            Assert.NotNull(organization.Sites);
            Assert.Single(organization.Sites);
            Assert.NotNull(organization.Workspaces);
            Assert.Single(organization.Workspaces);
            Assert.Single(organization.OrganizationUserRoles);
            var our = organization.OrganizationUserRoles.Single();
            Assert.NotEmpty(our.Role);
        }

        {
            var singleOrganization = await organizationService.GetByIdAsync(organization.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(singleOrganization);
            CompareOrganization(dbOrganization, singleOrganization);

            Assert.NotNull(singleOrganization.Name);
            Assert.NotNull(organization.Sites);
            Assert.Single(organization.Sites);
            Assert.NotNull(organization.Workspaces);
            Assert.Single(organization.Workspaces);
            var our = singleOrganization.OrganizationUserRoles.Single();
            Assert.NotEmpty(our.Role);
        }
    }

    [Fact]
    public async Task CreateOrganization_NoUsers_NoSites_Async()
    {
        using var serviceScope = AssembleOrganizationServiceTest();
        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();
        var dbUser = await CreateUserAsync(serviceScope);
        RunAsPrivilegedUser(serviceScope);

        var organization = await organizationService.CreateAsync(new OrganizationDescriptor
        {
            Name = "Test Organization",
            Description = "Test Description"
        }, TestContext.Current.CancellationToken);

        Assert.NotNull(organization);

        var dbContext = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var dbOrganization = await dbContext.Organizations.AsNoTracking().SingleAsync(i => i.Id == organization.Id, TestContext.Current.CancellationToken);
        CompareOrganization(dbOrganization, organization);
    }

    [Fact]
    public async Task CreateOrganization_NotPrivilged_Async()
    {
        using var serviceScope = AssembleOrganizationServiceTest();
        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();
        var dbUser = await CreateUserAsync(serviceScope);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
        {
            var organization = await organizationService.CreateAsync(new OrganizationDescriptor
            {
                Name = "Test Organization",
                Description = "Test Description"
            }, TestContext.Current.CancellationToken);
        }, i => i.Message != "User is not permitted to create Organizations." ? i.Message : null);
    }

    [Fact]
    public async Task SingleOrganization_MultipleSites()
    {
        using var serviceScope = AssembleOrganizationServiceTest();
        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();

        var (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork) = await PopulateDatabaseAsync(serviceScope);
        var dbSite1 = await CreateSiteAsync(serviceScope, []);

        var updated = await organizationService.UpdateAsync(dbOrganization.Id, new OrganizationUpdateDescriptor
        {
            AddSiteIds = [ dbSite1.Id ]
        }, TestContext.Current.CancellationToken);
        var organizations = await organizationService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Single(organizations);
        var organization = organizations.Single();
        CompareOrganization(dbOrganization, organization);

        {
            Assert.NotNull(organization.Name);
            Assert.NotEmpty(organization.Name);
            Assert.True(organization.Active);
            Assert.NotNull(organization.Sites);
            Assert.Equal(2, organization.Sites.Count());
            Assert.NotNull(organization.Workspaces);
            Assert.Single(organization.Workspaces);
            Assert.Single(organization.OrganizationUserRoles);
            var our = organization.OrganizationUserRoles.Single();
            Assert.NotEmpty(our.Role);
        }

        {
            var singleOrganization = await organizationService.GetByIdAsync(organization.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(singleOrganization);
            CompareOrganization(dbOrganization, singleOrganization);

            Assert.NotNull(singleOrganization.Name);
            Assert.NotNull(organization.Sites);
            Assert.Equal(2, organization.Sites.Count());
            Assert.NotNull(organization.Workspaces);
            Assert.Single(organization.Workspaces);
            var our = singleOrganization.OrganizationUserRoles.Single();
            Assert.NotEmpty(our.Role);
        }
    }

    [Fact]
    public async Task SingleOrganization_Add_RemoveUserRoles()
    {
        using var serviceScope = AssembleOrganizationServiceTest();
        var organizationService = serviceScope.ServiceProvider.GetRequiredService<IOrganizationService>();
        var fixture = new Fixture();

        var (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork) = await PopulateDatabaseAsync(serviceScope);

        var newRoles = new OrganizationUserRoleDescriptor[] {
            new OrganizationUserRoleDescriptor
                {
                    Role = fixture.Create<string>(),
                    UserId = dbUser.Id
                },
            new OrganizationUserRoleDescriptor
                {
                    Role = fixture.Create<string>(),
                    UserId = dbUser.Id
                }
            };

        // Add the role
        {
            var organization = await organizationService.UpdateAsync(dbOrganization.Id, new OrganizationUpdateDescriptor
            {
                AddOrganizationUserRoles = newRoles
            }, TestContext.Current.CancellationToken);

            Assert.NotNull(organization);
            foreach (var newRole in newRoles)
            {
                Assert.Contains(organization.OrganizationUserRoles, our => our.Role == newRole.Role && our.UserId == newRole.UserId);
            }
        }

        // Remove the role
        {
            var organization = await organizationService.UpdateAsync(dbOrganization.Id, new OrganizationUpdateDescriptor
            {
                RemoveOrganizationUserRoles = newRoles
            }, TestContext.Current.CancellationToken);

            Assert.NotNull(organization);
            foreach (var newRole in newRoles)
            {
                Assert.DoesNotContain(organization.OrganizationUserRoles, our => our.Role == newRole.Role && our.UserId == newRole.UserId);
            }
        }
    }
}
