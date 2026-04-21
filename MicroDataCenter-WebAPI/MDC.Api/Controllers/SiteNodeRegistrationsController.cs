using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.Extensions.Logging;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="siteNodeRegistrationService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey", Policy = "DatacenterTechnician")]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey", Policy = "GlobalAdministrator")]
    public class SiteNodeRegistrationsController(ISiteNodeRegistrationService siteNodeRegistrationService, ILogger<SiteNodeRegistrationsController> logger) : ODataController
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/SiteNodes
        [HttpGet("odata/SiteNodeRegistrations")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all Sites Node Registrations");
            return Ok(await siteNodeRegistrationService.GetAllAsync(cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="approveDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // PUT odata/SiteNodeRegistrations('id')
        [HttpPut("odata/SiteNodeRegistrations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Put))]
        public async Task<IActionResult> UpdateAsync([FromRoute] Guid key, [FromBody] SiteNodeRegistrationApprovalDescriptor approveDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Approving Site Node Registration '{key}'.", key);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Updated(await siteNodeRegistrationService.ApproveAsync(key, approveDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // DELETE odata/Sites/1
        [HttpDelete("odata/SiteNodeRegistrations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Delete))]
        public async Task<IActionResult> RemoveAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Removing Site Node Registration '{key}'.", key);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await siteNodeRegistrationService.DeleteAsync(key, cancellationToken);
            return NoContent();
        }
    }
}
