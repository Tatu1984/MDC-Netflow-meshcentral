using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.Extensions.Logging;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="organizationService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class OrganizationsController(IOrganizationService organizationService, ILogger<OrganizationsController> logger) : ODataController
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Organizations
        [HttpGet("odata/Organizations")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all Organization Entries.");
            var results = await organizationService.GetAllAsync(cancellationToken);
            return Ok(results);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Organizations(1)
        [EnableQuery]
        [HttpGet("odata/Organizations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> SingleAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching Organization with Id {organizationId}.", key);
            var item = await organizationService.GetByIdAsync(key, cancellationToken);
            if (item == null)
            {
                return NotFound("Organization not found.");
            }

            return Ok(item);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="organizationDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // POST: odata/Organizations
        [HttpPost("odata/Organizations")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> AddAsync([FromBody] OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Creating Organization with Name {organizationName} with description '{@organizationUpdateDescriptor}'.", organizationDescriptor.Name, organizationDescriptor);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(await organizationService.CreateAsync(organizationDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="organizationUpdateDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // PATCH odata/Organizations/1
        [HttpPatch("odata/Organizations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Update))]
        public async Task<IActionResult> UpdateAsync([FromRoute] Guid key, [FromBody] OrganizationUpdateDescriptor organizationUpdateDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating Organization '{organizationId}' with changes '{@organizationUpdateDescriptor}'.", key, organizationUpdateDescriptor);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Updated(await organizationService.UpdateAsync(key, organizationUpdateDescriptor, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // DELETE odata/Organizations/1
        [HttpDelete("odata/Organizations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Delete))]
        public async Task<IActionResult> RemoveAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Deleting Organization with Id {organizationId}.", key);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await organizationService.DeleteAsync(key, cancellationToken);
            return NoContent();
        }
    }
}
