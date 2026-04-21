using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.DtoEnrichment;
using MDC.Core.Services.Providers.MDCDatabase;
using Microsoft.EntityFrameworkCore;
using System.Collections;

namespace MDC.Core.Services.Api;

internal class OrganizationService(IMDCDatabaseService mdcDatabaseService, ITenantContext tenantContext) : IOrganizationService
{
    private async Task<IEnumerable> EnrichAsync(IEnumerable<Organization> organizations, CancellationToken cancellationToken)
    {
        //var selectedPaths = tenantContext.GetSelectedPaths<Organization>();

        //var sites = await EnrichAsync(organizations.Where(i => i.Sites != null).SelectMany(i => i.Sites!), expanded, cancellationToken);
        return organizations;
    }

    public async Task<IEnumerable<Organization>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        // Query
        var query = mdcDatabaseService.GetAllOrganizations();

        // Project
        var dtoQuery = query.Select(DtoProjections.ToOrganization);

        // Apply OData clauses and Materialize to DTO
        var results = tenantContext.ApplyToAndMaterialize<Organization>(dtoQuery);
        
        // Enrich
        await EnrichAsync(results, cancellationToken);

        return results;
    }




    public async Task<Organization> CreateAsync(OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default)
    {
        var dbOrganization = await mdcDatabaseService.CreateOrganizationAsync(organizationDescriptor, cancellationToken);
        return await GetByIdAsync(dbOrganization.Id, cancellationToken) ?? throw new InvalidOperationException($"Failed to fetch newly created organization Id {dbOrganization.Id}");
    }

    public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dbOrganizations = mdcDatabaseService.GetAllOrganizations();
        return await dbOrganizations
            .Select(DtoProjections.ToOrganization)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        //var dbOrganization = await databaseService.GetOrganizationByIdAsync(id, cancellationToken);
        //if (dbOrganization == null) return null;
        //return datacenterFactoryService.ComputeOrganizations([dbOrganization]).FirstOrDefault();
    }

    public async Task<Organization> UpdateAsync(Guid id, OrganizationUpdateDescriptor organizationUpdateDescriptor, CancellationToken cancellationToken = default)
    {
        var existingOrganization = await GetByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Organization Id {id} not found.");
        var dbOrganization = await mdcDatabaseService.UpdateOrganizationAsync(id, organizationUpdateDescriptor.Name, organizationUpdateDescriptor.Description, organizationUpdateDescriptor.AddSiteIds ?? [], organizationUpdateDescriptor.RemoveSiteIds ?? [], organizationUpdateDescriptor.AddOrganizationUserRoles ?? [], organizationUpdateDescriptor.RemoveOrganizationUserRoles ?? [], cancellationToken);
        return await GetByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Updated Organization Id {id} not found.");
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dbOrganization = await mdcDatabaseService.GetOrganizationByIdAsync(id, cancellationToken) ?? throw new InvalidOperationException($"Organization Id {id} not found.");
        await mdcDatabaseService.RemoveOrganizationAsync(id, cancellationToken);
    }
}
