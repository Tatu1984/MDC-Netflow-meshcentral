using AutoFixture;
using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Core.Tests.Services.Api;

public class SiteServiceTests : BaseMDCCoreTests
{
    internal IServiceScope AssembleSiteServiceTest()
    {
        return AssembleBaseMDCCoreTests();
    }

    [Fact]
    public async Task NoSites_GetAllAsync()
    {
        using var serviceScope = AssembleSiteServiceTest();
        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();

        var sites = (await siteService.GetAllAsync(TestContext.Current.CancellationToken));
        Assert.Empty(sites);
    }

    [Fact]
    public async Task SingleSite_GetAllAsync()
    {
        using var serviceScope = AssembleSiteServiceTest();
        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();
        RunAsPrivilegedUser(serviceScope);

        var (dbUser, dbOrganization, dbSite, dbWorkspace, dbVirtualNetwork) = await PopulateDatabaseAsync(serviceScope);
        PopulateMocksForSite(dbSite);
        

        var sites = await siteService.GetAllAsync(TestContext.Current.CancellationToken);
        
        // Assert Site
        {
            Assert.Single(sites);
            var site = sites.Single();
            CompareSite(dbSite, site);
        }

        // Get Site Detail
        {
            var site = await siteService.GetByIdAsync(dbSite.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(site);

            Assert.NotNull(site.Workspaces);
            Assert.NotNull(site.Organizations);
            CompareSite(dbSite, site);
        }

        // Update Site, No Change
        {
            var siteUpdateDescriptor = new SiteUpdateDescriptor()
            {

            };
            var updatedSite = await siteService.UpdateAsync(dbSite.Id, siteUpdateDescriptor, TestContext.Current.CancellationToken);
            Assert.NotNull(updatedSite);
            CompareSite(dbSite, updatedSite);
        }

        // Update Site Name
        {
            var fixture = new Fixture();
            var siteUpdateDescriptor = new SiteUpdateDescriptor()
            {
                Name = fixture.Create<string>()
            };
            var updatedSite = await siteService.UpdateAsync(dbSite.Id, siteUpdateDescriptor, TestContext.Current.CancellationToken);
            Assert.NotNull(updatedSite);
            Assert.Equal(dbSite.Name, updatedSite.Name);
            CompareSite(dbSite, updatedSite);
        }

        // Update Site Remove Organization
        {
            var fixture = new Fixture();
            var siteUpdateDescriptor = new SiteUpdateDescriptor()
            {
                RemoveOrganizationIds = [dbOrganization.Id]
            };
            var updatedSite = await siteService.UpdateAsync(dbSite.Id, siteUpdateDescriptor, TestContext.Current.CancellationToken);
            Assert.NotNull(updatedSite);
            Assert.NotNull(updatedSite.Organizations);
            Assert.DoesNotContain(updatedSite.Organizations, i => i.Id == dbOrganization.Id);
            Assert.DoesNotContain(dbSite.Organizations, i => i.Id == dbOrganization.Id);
            // CompareSite(dbSite, updatedSite);
        }

        // Update Site Add Organization
        {
            var fixture = new Fixture();
            var siteUpdateDescriptor = new SiteUpdateDescriptor()
            {
                AddOrganizationIds= [dbOrganization.Id]
            };
            var updatedSite = await siteService.UpdateAsync(dbSite.Id, siteUpdateDescriptor, TestContext.Current.CancellationToken);
            Assert.NotNull(updatedSite);
            Assert.NotNull(updatedSite.Organizations);
            Assert.Contains(updatedSite.Organizations, i => i.Id == dbOrganization.Id);
            Assert.Contains(dbSite.Organizations, i => i.Id == dbOrganization.Id);
            // CompareSite(dbSite, updatedSite);
        }

        // Delete SiteNode
        var dbSiteNode = dbSite.SiteNodes.Single();
        await siteService.DeleteAsync(dbSite.Id, dbSiteNode.Id, TestContext.Current.CancellationToken);

        var sitesAfterDelete = await siteService.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.Empty(sitesAfterDelete);
    }

    public class WorkspaceManagerDataEntry
    {
        public required int NumOrganizations;   // Must be ast least 1
        public required int[] MemberOfOrganizationIndicies;
        public required IEnumerable<int[]> SiteOrgnizationIndices;   // Each entry is a Site and the value is the index of organizations that are members of this site
    }


    [Theory, CombinatorialData]
    public async Task WorkspaceManager_SitesOrganizationsAccess_GetAllAsync(
        [CombinatorialRange(0, 7)] int siteOrganizationMembershipBits, // Bitwise: Site Organization assignment to Site0[Org0,Org1],Site1[Org0,Org1]
        [CombinatorialRange(0, 3)] int userOrganizationMembershipBits // Bitwise: User assigned to [Org0, Org1]
        )
    {
        /*
        Setup test with 2 Organizations and 2 Sites
        Evaluate permutations of
         -Organizations assigned to Sites
         - User membership to Organizations
         Assert that SiteService.GetAllAsync only returns Sites the Site's Workspaces where the User is a member of an Organizatation assigned to the Site

        User can access Site0 when ((userOrganizationMembershipBits & 3) | (siteOrganizationMembershipBits & 3)) > 0
        User can access Site1 when ((userOrganizationMembershipBits & 3) | ((siteOrganizationMembershipBits >> 2 ) & 3)) > 0
        */

        var expectedUserSiteMembershipBits =
            ((((siteOrganizationMembershipBits & 3) & (userOrganizationMembershipBits & 3)) > 0) ? 1 : 0 )          // Index[0] - Is user a member of Organization assigned to Site 0
            | 
            (((((siteOrganizationMembershipBits >> 2) & 3) & (userOrganizationMembershipBits & 3)) > 0) ? 2 : 0);   // Index[1] - Is user a member of Organization assigned to Site 1

        // Assemble
        using var serviceScope = AssembleSiteServiceTest();
        
        var tenantContext = serviceScope.ServiceProvider.GetRequiredService<ITenantContext>();
        ((TestMDCPrincipalAccessor)tenantContext).IsPrivilegedUser = false;
        Assert.NotNull(tenantContext.ObjectId);

        var siteService = serviceScope.ServiceProvider.GetRequiredService<ISiteService>();

        var context = serviceScope.ServiceProvider.GetRequiredService<MDCDbContext>();
        var fixture = CreateFixture();

        // Create the Test User
        var dbUser = (await context.Users.AddAsync(fixture.Build<DbUser>()
            .Without(x => x.OrganizationUserRoles)
            .Without(x => x.Activities)
            .Without(x => x.Active)
            .Without(x => x.Id)
            .Do(x => x.Active = true)
            .Do(x => x.Id = tenantContext.ObjectId.Value)
            .Create()
            , TestContext.Current.CancellationToken)).Entity;
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Create 2 Organizations
        List<DbOrganization> organizations = new List<DbOrganization>();
        for (int i = 0; i < 2; i++)
        {
            var dbOrganization = await context.Organizations.AddAsync(fixture.Build<DbOrganization>()
                .Without(x => x.Workspaces)
                .Without(x => x.Sites)
                .Without(x => x.OrganizationUserRoles)
                .Without(x => x.Active)
                .Do(x => x.Active = true)
                .Create(),
                TestContext.Current.CancellationToken);
            organizations.Add(dbOrganization.Entity);
        };
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Create 2 Sites
        List<DbSite> sites = new List<DbSite>();
        List<DbSite> expectedSites = new List<DbSite>();
        for (int siteIdx = 0; siteIdx < 2; siteIdx++)
        {
            var dbSite = await context.Sites.AddAsync(fixture.Build<DbSite>()
                .Without(x => x.Workspaces)
                .Without(x => x.Organizations)
                .Without(x => x.SiteNodes)
                .Create(),
                TestContext.Current.CancellationToken);

            var dbSiteNode = await context.SiteNodes.AddAsync(fixture.Build<DbSiteNode>()
                .Without(x => x.Site)
                .Do(x => x.Site = dbSite.Entity)
                .Create(),
                TestContext.Current.CancellationToken);
            sites.Add(dbSite.Entity);

            // If the user is expected to have access to this site then add to expected sites
            if ((expectedUserSiteMembershipBits & ((1 << siteIdx) & 3)) > 0)
            {
                expectedSites.Add(dbSite.Entity);
            }
        }
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Assign organizations to sites by siteOrganizationMembershipBits.   Create a Workspace with each organization-site assignment.
        var workspaceAddress = 100;
        var now = DateTime.UtcNow;
        for (int siteIdx = 0; siteIdx < 2; siteIdx++) 
        {
            for (int orgIdx = 0; orgIdx < 2; orgIdx++)
            {
                if ((
                    ((1 << orgIdx) & 3) // Org mask
                    & (siteOrganizationMembershipBits >> (2 * siteIdx) & 3)   // Site-Organization Membership mask
                    ) > 0)
                {
                    // Assign orgIdx to siteIdx
                    sites[siteIdx].Organizations.Add(organizations[orgIdx]);

                    // Create a Workspace for the Site-Organization
                    context.Workspaces.Add(new DbWorkspace
                    {
                        Address = workspaceAddress++,
                        Description = fixture.Create<string>(),
                        OrganizationId = organizations[orgIdx].Id,
                        SiteId = sites[siteIdx].Id,
                        Name = fixture.Create<string>(),
                        Status = fixture.Create<string>(),
                        CreatedAt = now,
                        UpdatedAt = now,
                        Locked = false,
                        IsDeleted = false
                    });
                }            
            }
        }
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Add dbUser to each of the organizations identified by userOrganizationMembershipBits
        List<DbOrganization> expectedOrganizations = new List<DbOrganization>();
        for (int orgIdx = 0; orgIdx < 2; orgIdx++)
        {
            if ((userOrganizationMembershipBits & ((1 << orgIdx) & 3)) > 0)
            {
                context.OrganizationUserRoles.Add(new DbOrganizationUserRole
                {
                    CreatedAt = now,
                    UpdatedAt = now,
                    UserId = dbUser.Id,
                    OrganizationId = organizations[orgIdx].Id,
                    Role = fixture.Create<string>(),
                    IsDeleted = false
                });
                expectedOrganizations.Add(organizations[orgIdx]);
            }
        }
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Act
        var actualSites = await siteService.GetAllAsync(TestContext.Current.CancellationToken);

        // Assert
        // Expect to get the sites that belong to the target user's organization(s)
        if (!expectedSites.Select(i => i.Id).Order().SequenceEqual(actualSites.Select(i => i.Id).Order()))
        {
            var allSites = await context.Sites.IgnoreQueryFilters().ToArrayAsync(TestContext.Current.CancellationToken);
            Assert.Equal(expectedSites.Select(i => i.Id).Order(), actualSites.Select(i => i.Id).Order());
        }

        foreach (var actualSite in actualSites)
        {
            ValidateSiteAccess(actualSite, expectedSites, expectedOrganizations);

            /******************************************************************************/
            /* SKIP For now to Get Site Detail by Id or Name, PVE will need to be mocked  */
            /******************************************************************************/
            //// Ensure that the results are the same when getting a single Site by Id
            //var actualSiteById = await siteService.GetByIdAsync(actualSite.Id, TestContext.Current.CancellationToken);
            //Assert.NotNull(actualSiteById);
            //Assert.Equal(actualSite.OrganizationIds.Order(), actualSiteById.OrganizationIds.Order());
            //Assert.Equal(actualSite.WorkspaceIds.Order(), actualSiteById.WorkspaceIds.Order());
            //ValidateSiteAccess(actualSiteById, expectedSites, expectedOrganizations);

            //// Ensure that the results are the same when getting a single Site by Name
            //var actualSiteByName = await siteService.GetByNameAsync(actualSite.Name, TestContext.Current.CancellationToken);
            //Assert.NotNull(actualSiteByName);
            //Assert.Equal(actualSite.OrganizationIds.Order(), actualSiteByName.OrganizationIds.Order());
            //Assert.Equal(actualSite.WorkspaceIds.Order(), actualSiteByName.WorkspaceIds.Order());
            //ValidateSiteAccess(actualSiteByName, expectedSites, expectedOrganizations);
        }
    }

    private void ValidateSiteAccess(Site actualSite, List<DbSite> expectedSites, List<DbOrganization> expectedOrganizations)
    {
        var expectedSite = expectedSites.Single(i => i.Id == actualSite.Id);

        // Expect the actual organizations of the site to only be those that the user is a member of
        foreach (var organization in actualSite.Organizations ?? [])
        {
            if (!expectedOrganizations.Any(i => i.Id == organization.Id))
                Assert.Contains(expectedOrganizations, i => i.Id == organization.Id);
        }

        // Expect the actual workspaces of the site to only be those that belong to an organization that the user is a member of
        foreach (var workspace in actualSite.Workspaces ?? [])
        {
            Assert.Contains(expectedSite.Workspaces, i => i.Id == workspace.Id);
        }

        Assert.Equal(expectedSite.SiteNodes.Select(i => i.Name).Order(), actualSite.SiteNodes.Select(i => i.Name).Order());
    }
}
