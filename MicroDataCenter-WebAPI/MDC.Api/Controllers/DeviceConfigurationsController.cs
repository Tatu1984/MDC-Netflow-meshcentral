using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.Extensions.Logging;
using System.Threading;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="deviceConfigurationService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class DeviceConfigurationsController(IDeviceConfigurationService deviceConfigurationService, ILogger<DeviceConfigurationsController> logger) : ODataController
    {
        /// <summary>
        /// 
        /// </summary>
        /// <returns></returns>
        // GET: odata/DeviceConfigurations
        [EnableQuery(PageSize = 10)]
        [HttpGet("odata/DeviceConfigurations")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync()
        {
            logger.LogDebug("Fetching all Device Configurations.");
            return Ok(await deviceConfigurationService.GetAllAsync());
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <returns></returns>
        // GET: odata/DeviceConfigurations(1)
        [EnableQuery]
        [HttpGet("odata/DeviceConfigurations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> SingleAsync([FromRoute] Guid key)
        {
            var item = await deviceConfigurationService.GetByIdAsync(key);
            if (item == null)
            {
                return NotFound("Device Configuration not found.");
            }

            return Ok(item);
        }

        ///// <summary>
        ///// 
        ///// </summary>
        ///// <param name="address"></param>
        ///// <returns></returns>
        //// GET: odata/DeviceConfigurations/GetByAddress(address='0100')
        //[EnableQuery]
        //[HttpGet("odata/DeviceConfigurations/GetByAddress(address={address})")]
        //[ApiConventionMethod(typeof(DefaultApiConventions),
        //             nameof(DefaultApiConventions.Get))]
        //public async Task<IActionResult> FetchByAddressAsync([FromRoute] string address)
        //{
        //    var item = await deviceConfigurationService.GetByAddressAsync(address);
        //    if (item == null)
        //    {
        //        return NotFound("Device Configuration not found.");
        //    }

        //    return Ok(item);
        //}

        /// <summary>
        /// 
        /// </summary>
        /// <param name="deviceConfiguration"></param>
        /// <returns></returns>
        // POST: odata/DeviceConfigurations
        [HttpPost("odata/DeviceConfigurations")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> AddAsync([FromBody] DeviceConfiguration deviceConfiguration)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(await deviceConfigurationService.CreateAsync(deviceConfiguration));
        }

        ///// <summary>
        ///// 
        ///// </summary>
        ///// <param name="key"></param>
        ///// <param name="delta"></param>
        ///// <returns></returns>
        //// PATCH odata/DeviceConfigurations/1
        //[HttpPatch("odata/DeviceConfigurations({key})")]
        //[ApiConventionMethod(typeof(DefaultApiConventions),
        //             nameof(DefaultApiConventions.Update))]
        //public async Task<IActionResult> UpdateAsync([FromRoute] Guid key, [FromBody] Delta<DeviceConfiguration> delta)
        //{
        //    if (!ModelState.IsValid)
        //    {
        //        return BadRequest(ModelState);
        //    }
        //    var item = await deviceConfigurationService.GetByIdAsync(key);
        //    if (item == null)
        //    {
        //        return NotFound("Device Configuration not found.");
        //    }

        //    var updated = delta.Patch(item);

        //    return Ok(await deviceConfigurationService.UpdateAsync(updated));
        //}

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <returns></returns>
        // DELETE odata/DeviceConfigurations/1
        [HttpDelete("odata/DeviceConfigurations({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions),
                     nameof(DefaultApiConventions.Delete))]
        public async Task<IActionResult> RemoveAsync([FromRoute] Guid key)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await deviceConfigurationService.DeleteAsync(key);
            return NoContent();
        }
    }
}
