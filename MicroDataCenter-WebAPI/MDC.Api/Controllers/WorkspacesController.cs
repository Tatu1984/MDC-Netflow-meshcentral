using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.Extensions.Logging;
using System.Text.Json.Nodes;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="workspaceService"></param>
    /// <param name="logger"></param>
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class WorkspacesController(IWorkspaceService workspaceService, ILogger<WorkspacesController> logger) : ODataController
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Workspaces
        [HttpGet("odata/Workspaces")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> AllAsync(CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching all Workspaces.");
            return Ok(await workspaceService.GetAllAsync(cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Workspaces(1)
        [HttpGet("odata/Workspaces({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> SingleAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching Workspace '{workspaceId}'.", key);
            var item = await workspaceService.GetByIdAsync(key, cancellationToken);
            if (item == null)
            {
                return NotFound("Workspace not found.");
            }

            return Ok(item);
        }

        /// <summary>
        /// Create a new Workspace at the specified siteId using the provided workspace descriptor.
        /// </summary>
        /// <param name="createWorkspaceParameters"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // POST: odata/Workspaces
        [HttpPost("odata/Workspaces")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> AddAsync([FromBody] CreateWorkspaceParameters createWorkspaceParameters, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Creating Workspace with descriptor '{@createWorkspaceParameters}'.", createWorkspaceParameters);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(await workspaceService.CreateAsync(createWorkspaceParameters, cancellationToken));
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // DELETE odata/Workspaces/1
        [HttpDelete("odata/Workspaces({key})")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Delete))]
        public async Task<IActionResult> RemoveAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Removing Workspace '{workspaceId}'.", key);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await workspaceService.DeleteAsync(key, cancellationToken);
            return NoContent();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        // GET: odata/Workspaces(1)
        // [EnableQuery]
        [HttpGet("odata/Workspaces({key})/Descriptor")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<IActionResult> GetDescriptorAsync([FromRoute] Guid key, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Fetching WorkspaceDescriptor for Workspace '{key}'.", key);
            var item = await workspaceService.GetWorkspaceDescriptorAsync(key, cancellationToken);
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
        /// <param name="workspaceDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        [HttpPost("odata/Workspaces({key})/WorkspaceDescriptor")]  
        public async Task<IActionResult> UpdateDescriptorAsync([FromRoute] Guid key, [FromBody] JsonNode workspaceDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating WorkspaceDescriptor for Workspace '{key}' with changes '{@workspaceDescriptor}'.", key, workspaceDescriptor);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await workspaceService.UpdateAsync(key, workspaceDescriptor, cancellationToken);

            return NoContent();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="workspaceLockDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        [HttpPost("odata/Workspaces({key})/Lock")]
        public async Task<IActionResult> SetLockAsync([FromRoute] Guid key, [FromBody] WorkspaceLockDescriptor workspaceLockDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Updating Lock for Workspace '{key}' with value '{@locked}'.", key, workspaceLockDescriptor.Locked);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await workspaceService.SetWorkspaceLockAsync(key, workspaceLockDescriptor.Locked, cancellationToken);

            return NoContent();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="key"></param>
        /// <param name="runCommandDescriptor"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        [HttpPost("odata/Workspaces({key})/Command")]
        public async Task<IActionResult> RunCommandAsync([FromRoute] Guid key, [FromBody] RunCommandDescriptor runCommandDescriptor, CancellationToken cancellationToken = default)
        {
            logger.LogDebug("Running Command on Workspace '{key}' for Virtual Machine Index {@virtualMachineIndex}'.", key, runCommandDescriptor.VirtualMachineIndex);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var workspace = await workspaceService.RunCommandAsync(key, runCommandDescriptor, cancellationToken);

            return Ok(workspace);
        }
    }
}
