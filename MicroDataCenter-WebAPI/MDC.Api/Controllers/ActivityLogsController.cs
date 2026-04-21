using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="activityLogService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class ActivityLogsController(IActivityLogService activityLogService, ILogger<ActivityLogsController> logger) : ODataController
    {
        /// <summary>
        /// Get all Application Roles that can be assigned to users for role-based access control within the system.
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Users
        [HttpGet("odata/ActivityLogs")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> GetAllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all ActivityLog Entries.");            
            var results = await activityLogService.GetAllAsync(cancellationToken);
            return Ok(results);
        }
    }
}
