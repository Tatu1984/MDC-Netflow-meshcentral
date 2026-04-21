using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.DtoEnrichment;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MDC.Core.Services.Api;

internal class SiteService(IMDCEndpointService mdcEndpointService, IMDCDatabaseService databaseService, ILogger<SiteService> logger, ITenantContext tenantContext, IDtoEnrichmentService dtoEnrichment) : ISiteService
{
    public async Task<IEnumerable<Site>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        // Query
        var query = databaseService.GetAllSites();

        // Project
        var dtoQuery = query.Select(DtoProjections.ToSite);

        // Apply OData clauses and Materialize to DTO
        var results = tenantContext.ApplyToAndMaterialize<Site>(dtoQuery);

        // Enrich
        await dtoEnrichment.EnrichAsync(results, false, cancellationToken);
        
        return results;
    }

    public async Task<Site?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        // Query
        var query = databaseService.GetAllSites().Where(dbSite => dbSite.Id == id);

        // Project
        var dtoQuery = query.Select(DtoProjections.ToSite);

        // Apply OData clauses and Materialize to DTO
        var results = tenantContext.ApplyToAndMaterialize<Site>(dtoQuery);

        // Enrich
        await dtoEnrichment.EnrichAsync(results, true, cancellationToken);

        return results.SingleOrDefault() ?? throw new InvalidOperationException($"Site Id '{id}' not found.");
    }


    /*
    public async Task<(Site, SiteNode)> CreateAsync(SiteDescriptor siteDescriptor, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Register Site Node with Member Address '{memberAddress}' and SerialNumber {serialNumber}.", siteDescriptor.MemberAddress, siteDescriptor.SerialNumber);

        // Ensure that if no organization is specified that the default organization is a member of the site
        var port = siteDescriptor.Port ?? 8006;
        int timeout = siteDescriptor.Timeout ?? 30;

        // Before making changes, Get the cluster information using privileged access
        var priviligedPVEClient = await mdcEndpointService.CreatePrivilegedPVEClient(siteDescriptor.MemberAddress, siteDescriptor.RegistrationUserName, siteDescriptor.RegistrationPassword, port, siteDescriptor.ValidateServerCertificate, timeout, cancellationToken);
        var clusterStatus = await priviligedPVEClient.GetClusterStatusAsync(cancellationToken);
        logger.LogInformation("Privileged PVE Client for Site Node with Member Address '{memberAddress}' fetched Cluster Status '{@clusterStatus}'.", siteDescriptor.MemberAddress, clusterStatus);
        var clusterName = clusterStatus.GetClusterNode().Name;
        var siteNodeName = clusterStatus.GetLocalNode().Name;

        // Check if the Site is already registered
        var dbSite = await databaseService.GetSiteByClusterNameAsync(clusterName, cancellationToken);
        if (dbSite == null)
        {
            logger.LogInformation("Creating new Site with cluster name '{clusterName}' from Site Node with Member Address '{memberAddress}'.", clusterName, siteDescriptor.MemberAddress);

            // Always create new Site registration (API token) when creating a new Site
            var newEndpoint = await mdcEndpointService.RegisterMicroDataCenterAsync(siteDescriptor.MemberAddress, siteNodeName, siteDescriptor.RegistrationUserName, siteDescriptor.RegistrationPassword, port, siteDescriptor.ValidateServerCertificate, timeout, cancellationToken);

            // Site does not exist in database so create it
            dbSite = await databaseService.CreateSiteAsync(siteName, siteDescriptor.Description ?? string.Empty, newEndpoint.PVEClientConfiguration.TokenId, newEndpoint.PVEClientConfiguration.Secret, cancellationToken);
        }

        // Check to see if the Site node is already registered 
        var dbSiteNode = await databaseService.GetSiteNodeAsync(siteDescriptor.MemberAddress, cancellationToken);
        if (dbSiteNode == null)
        {
            logger.LogInformation("Adding Site Node with Member Address '{memberAddress}' named '{siteNodeName}' to Site named '{siteName}' Site Id '{siteId}'.", siteDescriptor.MemberAddress, siteNodeName, siteName, dbSite.Id);

            // Create the Site Node in the database
            dbSiteNode = await databaseService.CreateSiteNodeAsync(dbSite.Id, siteDescriptor.MachineId, siteDescriptor.MemberAddress, siteNodeName, siteDescriptor.SerialNumber, port, siteDescriptor.ValidateServerCertificate, cancellationToken);
        }

        // Ensure that the Site Node belongs to the site - in case the MemberAddress finds an existing SiteNode that does not belong to the site looked up by name
        if (dbSiteNode.SiteId != dbSite.Id)
        {
            throw new InvalidOperationException($"Member Address {siteDescriptor} is Site Node {siteNodeName} for Site {siteName} but is already registered for a different Site.");
        }
        
        // Ensure organizations are set for the site
        //var dbOrganizationDefault = await databaseService.GetDefaultOrganizationAsync(dbSite, cancellationToken);
        // var organizationIds = siteDescriptor.OrganizationIds ?? [dbOrganizationDefault.Id];
        dbSite = await databaseService.UpdateSiteAsync(dbSite.Id, null, null, null, siteDescriptor.OrganizationIds, cancellationToken);

        // Verify that the Site credentials still work and create new Registration if it does not
        var mdcEndpoint = await mdcEndpointService.GetMicroDataCenterEndpointAsync(dbSiteNode, dbSite.ApiTokenId, dbSite.ApiSecret, cancellationToken);
        var pveClient = pveClientFactory.Create(mdcEndpoint);
        try
        {
            var verifyClusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
            logger.LogInformation("Verified API Token Access to Site '{siteName}' using Site Node '{siteNodeName}'  Cluster Status '{@clusterStatus}'.", siteName, siteNodeName, verifyClusterStatus);
        }
        catch (Exception)   // TODO: catch a Not Authorized exception then re-register the MicroDatacenter
        {
            mdcEndpoint = await mdcEndpointService.RegisterMicroDataCenterAsync(siteDescriptor.MemberAddress, siteNodeName, siteDescriptor.RegistrationUserName, siteDescriptor.RegistrationPassword, port, siteDescriptor.ValidateServerCertificate, timeout, cancellationToken);
            dbSite = await databaseService.UpdateSiteAsync(dbSite.Id, null, mdcEndpoint.PVEClientConfiguration.TokenId, mdcEndpoint.PVEClientConfiguration.Secret, null, cancellationToken);
        }

        // Ensure the Site is Configured to be a MicroDatacenter
        await mdcEndpointService.ConfigureSiteAsync(dbSiteNode, priviligedPVEClient, new ConfigureSiteParameters { DataEgressOnMgmtNetwork = siteDescriptor.DataEgressOnMgmtNetwork ?? false }, cancellationToken);

        // Always Import workspaces from the Site.  Use the specified organization otherwise import to Default organization
        if (siteDescriptor.ImportToOrganizationId.HasValue)
        {
            await datacenterFactoryService.ImportSiteAsync(dbSiteNode, siteDescriptor.ImportToOrganizationId.Value, cancellationToken);
        }
        //else
        //{
        //    await datacenterFactoryService.ImportSiteAsync(dbSiteNode, siteDescriptor.OrganizationIds.First(), cancellationToken);
        //}

        var site = await datacenterFactoryService.ComputeSiteDetailAsync(dbSite, cancellationToken); // .FirstOrDefault() ?? throw new InvalidOperationException($"Site '{siteName}' not found.");
        var siteNode = site.SiteNodes.FirstOrDefault(n => n.Name == dbSiteNode.Name) ?? throw new InvalidOperationException($"Site Node with Name '{dbSiteNode.Name}' not found for Site '{siteName}'.");
        return (site, siteNode);
    }*/

    public async Task DeleteAsync(Guid siteId, Guid siteNodeId, CancellationToken cancellationToken = default)
    {
        //if (!(mdcPrincipalAccessor.IsDatacenterTechnician || mdcPrincipalAccessor.IsGlobalAdministrator))
        //{
        //    throw new UnauthorizedAccessException("Only a user with the Datacenter Technician or Global Administrator role can delete a site.");
        //}
        var site = await databaseService.FindSiteAsync(siteId, cancellationToken) ?? throw new InvalidOperationException($"Site Id '{siteId}' not found.");
        var siteNode = site.SiteNodes.FirstOrDefault(n => n.Id == siteNodeId) ?? throw new InvalidOperationException($"Site Node Id '{siteNodeId}' not found for Site Id '{siteId}'.");

        // First delete the Database record of the Site Node with the specified Member Address.  This will cascade and delete the Site if this is the only Site Node associated with the Site, and will also delete any related records such as Workspaces and Endpoints.  Deleting the Site Node from the database will also prevent any further API calls to the site from succeeding, which will effectively disable the site in MDC.
        // We can consider adding a "Disabled" flag to the Site and Site Node in the future if we want to keep the records but prevent access to the site.
        await databaseService.DeleteSiteNodeAsync(siteNodeId, cancellationToken);

        // Second remove the Site Node from the ZeroTier network.  This will prevent any further network communication with the site, which will effectively disable the site in MDC.  We should do this after deleting the database record so that if there are any issues with communicating with the ZeroTier network, the site will still be disabled in MDC and can be retried later.
        await mdcEndpointService.RemoveMicroDatacenterEndpointAsync(siteNode.MemberAddress, cancellationToken);
    }

    //public async Task<Site?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
    //{
    //    var dbSite = await databaseService.GetSiteByNameAsync(name, cancellationToken) ?? throw new InvalidOperationException($"Site '{name}' not found.");

    //    return (await datacenterFactoryService.ComputeSiteDetailAsync(dbSite, cancellationToken));
    //}

    public async Task<Site> UpdateAsync(Guid id, SiteUpdateDescriptor siteUpdateDescriptor, CancellationToken cancellationToken = default)
    {
        var dbSite = await databaseService.UpdateSiteAsync(id, siteUpdateDescriptor.Name, siteUpdateDescriptor.Description, null, null, siteUpdateDescriptor.AddOrganizationIds, siteUpdateDescriptor.RemoveOrganizationIds, cancellationToken);
        return (await GetByIdAsync(dbSite.Id, cancellationToken)) ?? throw new InvalidOperationException($"Site Id '{id}' not found.");
    }

    public async Task<DownloadableTemplate[]> GetDownloadableTemplatesAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Get Downloadable Templates for Site Id {siteId}", siteId);
        var dbSite = await databaseService.FindSiteAsync(siteId, cancellationToken) ?? throw new InvalidOperationException($"Site Id '{siteId}' not found.");

        return await mdcEndpointService.GetDownloadableTemplatesAsync(dbSite, cancellationToken);
    }

    public async Task<string> DownloadTemplateAsync(Guid siteId, DownloadTemplateDescriptor downloadTemplateDescriptor, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Download Template for Site Id {siteId} with digets {digest}", siteId, downloadTemplateDescriptor.Digest);
        var dbSite = await databaseService.FindSiteAsync(siteId, cancellationToken) ?? throw new InvalidOperationException($"Site Id '{siteId}' not found.");

        return await mdcEndpointService.DownloadTemplateAsync(dbSite, downloadTemplateDescriptor, cancellationToken);
    }

    public async Task<string?> GetDownloadTemplateStatusAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        var dbSite = await databaseService.FindSiteAsync(siteId, cancellationToken) ?? throw new InvalidOperationException($"Site Id '{siteId}' not found.");

        return await mdcEndpointService.GetDownloadTemplateStatusAsync(dbSite, cancellationToken);
    }
}
