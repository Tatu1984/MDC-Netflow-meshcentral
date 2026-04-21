using MDC.Core.Services.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.Extensions.Logging;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="siteService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class SitesController(ISiteService siteService, ILogger<SitesController> logger) : ODataController
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Sites
        [HttpGet("odata/Sites")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all Sites.");
            return Ok(await siteService.GetAllAsync( cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Sites(1)
        [HttpGet("odata/Sites({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> SingleAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching Site '{key}'.", key);
            var item = await siteService.GetByIdAsync(key, cancellationToken);
            if (item == null)
            {
                return NotFound("Site not found.");
            }

            return Ok(item);
        }

        ///// <summary>
        ///// 
        ///// </summary>
        ///// <param name="siteDescriptor"></param>
        ///// <param name="cancellationToken"></param>
        ///// <returns></returns>
        //// POST: odata/Sites
        //[HttpPost("odata/Sites")]
        //[ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        //public async Task<IActionResult> AddAsync([FromBody] SiteDescriptor siteDescriptor, CancellationToken cancellationToken = default)
        //{
        //    logger.LogDebug("Adding Site with Member Address '{memberAddress}'.", siteDescriptor.MemberAddress);
        //    if (!ModelState.IsValid)
        //    {
        //        return BadRequest(ModelState);
        //    }

        //    return Created(await siteService.CreateAsync(siteDescriptor, cancellationToken));
        //}

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="siteUpdateDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // PATCH odata/Organizations/1
        [HttpPatch("odata/Sites({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Update))]
        public async Task<IActionResult> UpdateAsync([FromRoute] Guid key, [FromBody] SiteUpdateDescriptor siteUpdateDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating Site '{siteId}' with changes '{@siteUpdateDescriptor}'.", key, siteUpdateDescriptor);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Updated(await siteService.UpdateAsync(key, siteUpdateDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="descriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // DELETE odata/Sites/1
        [HttpPost("odata/Sites({key})/RemoveNode")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Delete))]
        public async Task<IActionResult> RemoveNodeAsync([FromRoute] Guid key, [FromBody] SiteNodeRemoveDescriptor descriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Removing from Site '{key}' Node Id '{siteNodeId}'.", key, descriptor.SiteNodeId);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await siteService.DeleteAsync(key, descriptor.SiteNodeId, cancellationToken);
            return NoContent();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Sites(1)
        // [EnableQuery]
        [HttpGet("odata/Sites({key})/DownloadableTemplates")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> GetDownloadableTemplatesAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching Downloadable Templates for Site'{key}'.", key);
            var item = await siteService.GetDownloadableTemplatesAsync(key, cancellationToken);
            if (item == null)
            {
                return NotFound("Workspace not found.");
            }

            return Ok(item);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="downloadTemplateDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // POST: odata/Sites
        [HttpPost("odata/Sites({key})/DownloadTemplate")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> DownloadTemplateAsync([FromRoute] Guid key, [FromBody] DownloadTemplateDescriptor downloadTemplateDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Site '{key}' Begin downloading template for '{@downloadTemplateDescriptor}'.", key, downloadTemplateDescriptor);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // TODO: This needs to return a route to the Workspaces Controller
            return Ok(await siteService.DownloadTemplateAsync(key, downloadTemplateDescriptor, cancellationToken));
        }
    }
}
