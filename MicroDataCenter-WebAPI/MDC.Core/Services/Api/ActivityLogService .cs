using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.DtoEnrichment;
using MDC.Core.Services.Providers.MDCDatabase;
using System.Collections;

namespace MDC.Core.Services.Api;

/// <summary />
internal class ActivityLogService(IMDCDatabaseService mdcDatabaseService, ITenantContext tenantContext, IUserService userService) : IActivityLogService
{
    private async Task EnrichAsync(IEnumerable<ActivityLog> activityLogs, CancellationToken cancellationToken)
    {
        var selectedPaths = tenantContext.GetSelectedPaths<ActivityLog>();

        if (selectedPaths.Contains("User"))
        {
            await userService.EnrichAsync(activityLogs.Where(i => i.User != null).Select(i => i.User!), cancellationToken);
        }
    }

    /// <summary />
    public async Task<IEnumerable<ActivityLog>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        // Query
        var query = mdcDatabaseService.GetAllActivityLogs();

        // Project
        var dtoQuery = query.Select(DtoProjections.ToActivityLog);

        // Apply OData clauses and Materialize to DTO
        var results = tenantContext.ApplyToAndMaterialize<ActivityLog>(dtoQuery);

        // Enrich
        await EnrichAsync(results, cancellationToken);

        return results;
    }
}
