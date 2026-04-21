using MDC.Core.Models;
using MDC.Core.Services.Providers.MDCDatabase;

namespace MDC.Core.Services.Providers.DatacenterFactory;

internal interface IDatacenterFactoryService
{
    Task ImportSiteAsync(DbSiteNode dbSiteNode, Guid organizationId, CancellationToken cancellationToken = default);

    Task<DatacenterEntry> GetDatacenterEntryAsync(DbSite dbSite, CancellationToken cancellationToken = default);

    Task<DatacenterEntry> GetDatacenterEntryByWorkspaceIdAsync(Guid workspaceId, bool populateDatacenterTemplates = false, CancellationToken cancellationToken = default);

    Task SetWorkspaceLockAsync(Guid workspaceId, bool locked, CancellationToken cancellationToken = default);

    Task<VNCSession> CreateVNCProxyAsync(Guid workspaceId, int virtualMachineIndex, CancellationToken cancellationToken = default);
}
