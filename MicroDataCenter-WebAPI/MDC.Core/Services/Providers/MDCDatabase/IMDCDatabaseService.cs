using MDC.Core.Models;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Providers.MDCDatabase
{
    internal interface IMDCDatabaseService
    {
        Task<DbSite> CreateSiteAsync(string name, string description, string apiTokenId, string apiSecret, CancellationToken cancellationToken = default);

        Task<DbSiteNode> CreateSiteNodeAsync(Guid siteId, Guid machineId, string memberAddress, string name, string serialNumber, int apiPort, bool apiValidateServerCertificate, CancellationToken cancellationToken = default);

        Task<DbSite> UpdateSiteAsync(Guid id, string? name, string? description, string? apiTokenId, string? apiSecret, Guid[]? addOrganizationIds, Guid[]? removeOrganizationIds, CancellationToken cancellationToken = default);

        // Task<DbSite?> GetSiteByClusterNameAsync(string clusterName, CancellationToken cancellationToken = default);

        Task<DbSite?> FindSiteAsync(Guid siteId, CancellationToken cancellationToken = default);

        IQueryable<DbSite> GetAllSites();

        IQueryable<DbSiteNode> GetAllSitesNodes();

        Task<DbSiteNode?> GetSiteNodeAsync(string memberAddress, CancellationToken cancellationToken = default);

        Task DeleteSiteNodeAsync(Guid siteNodeId, CancellationToken cancellationToken = default);

        Task<DbWorkspace[]> ImportWorkspacesAsync(Guid siteId, Guid organizationId, IEnumerable<WorkspaceEntry> workspaceEntries, CancellationToken cancellationToken = default);

        Task<DbVirtualNetwork[]> ImportVirtualNetworksAsync(IEnumerable<WorkspaceEntry> workspaceEntries, CancellationToken cancellationToken = default);

        Task<DbWorkspace?> GetWorkspaceByIdAsync(Guid id, CancellationToken cancellationToken = default);

        IQueryable<DbWorkspace> GetAllWorkspaces();

        Task<DbWorkspace> CreateWorkspaceAsync(Guid siteId, Guid organizationId, string workspaceName, string? description, string[] virtualNetworkNames, DatacenterSettings datacenterSettings, CancellationToken cancellationToken = default);

        Task<DbWorkspace> UpdateWorkspaceAsync(DatacenterEntry datacenterEntry, Guid workspaceId, WorkspaceDescriptor workspaceDescriptor, CancellationToken cancellationToken = default);

        Task<int> DeleteWorkspaceAsync(Guid workspaceId, CancellationToken cancellationToken = default);

        Task SetWorkspaceLockAsync(Guid workspaceId, bool locked, CancellationToken cancellationToken = default);

        Task<DbVirtualNetwork> UpdateVirtualNetworkAsync(Guid virtualNetworkId, CancellationToken cancellationToken = default);

        #region Users
        IQueryable<DbUser> GeAlltUsers();

        IQueryable<DbActivityLog> GetAllActivityLogs();

        Task<DbUser?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<DbUser> CreateUserAsync(Guid id, string name, UserOrganizationRole[]? userOrganizationRoles, CancellationToken cancellationToken = default);

        // Task<DbUser> UpdateUserAsync(Guid id,string[]? addOrganizationUserRoles, string[]? removeOrganizationUserRoles, CancellationToken cancellationToken = default);

        Task<bool> RemoveUserAsync(Guid id, CancellationToken cancellationToken = default);
        #endregion

        #region Organizations
        //Task<DbOrganization> GetDefaultOrganizationAsync(DbSite site, CancellationToken cancellationToken = default);

        IQueryable<DbOrganization> GetAllOrganizations();

        Task<DbOrganization?> GetOrganizationByIdAsync(Guid Id, CancellationToken cancellationToken = default);

        Task<DbOrganization> CreateOrganizationAsync(OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default);

        Task<DbOrganization> UpdateOrganizationAsync(Guid id, string? name, string? description, Guid[] addSiteIds, Guid[] removeSiteIds, OrganizationUserRoleDescriptor[] addUsers, OrganizationUserRoleDescriptor[] removeUsers, CancellationToken cancellationToken = default);

        Task<bool> RemoveOrganizationAsync(Guid id, CancellationToken cancellationToken = default);

        //Task<DbVirtualNetwork?> GetVirtualNetworkByRemoteNetworkIdAsync(string id, CancellationToken cancellationToken = default);
        #endregion

        IQueryable<DbSiteNodeRegistration> GetSiteNodeRegistrations();

        Task<DbSiteNodeRegistration?> GetSiteNodeRegistrationByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<DbSiteNodeRegistration> CreateSiteNodeRegistrationAsync(Guid uuid, JsonNode systemInformation, CancellationToken cancellationToken = default);

        Task<DbSiteNodeRegistration> UpdateSiteNodeRegistrationAsync(Guid uuid, JsonNode? deviceInformation, string? memberAddress, bool complete, CancellationToken cancellationToken = default);

        Task<DbSiteNodeRegistration> AssignSiteNodeRegistrationAsync(Guid registrationId, Guid siteNodeId, CancellationToken cancellationToken = default);

        Task DeleteSiteNodeRegistrationAsync(Guid id, CancellationToken cancellationToken = default);

        Task<Dictionary<Guid, DbSiteNodeRegistration>> GetSiteNodeRegistrationsForSiteAsync(Guid siteId, CancellationToken cancellationToken = default);
    }
}
