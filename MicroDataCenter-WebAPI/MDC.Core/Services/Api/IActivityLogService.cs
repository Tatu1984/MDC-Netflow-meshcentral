using System.Collections;

namespace MDC.Core.Services.Api;

/// <summary />
public interface IActivityLogService
{
    /// <summary />
    Task<IEnumerable<ActivityLog>> GetAllAsync(CancellationToken cancellationToken = default);
}
