using MDC.Core.Services.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.Extensions.Logging;
using System.Text.Json.Nodes;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="userService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class AppRolesController(IUserService userService, ILogger<AppRolesController> logger) : ODataController
    {
        /// <summary>
        /// Get all Application Roles that can be assigned to users for role-based access control within the system.
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Users
        [EnableQuery]
        [HttpGet("odata/AppRoles")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> GetAllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all AppRoles.");
            return Ok(await userService.GetAppRoles(cancellationToken));
        }
    }
}
