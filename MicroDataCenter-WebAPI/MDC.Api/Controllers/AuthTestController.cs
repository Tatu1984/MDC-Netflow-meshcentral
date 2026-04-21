using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// Controller for testing authentication and authorization configurations.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthTestController : ControllerBase
    {
        /// <summary>
        /// Endpoint accessible without authentication.
        /// </summary>
        /// <returns>A message confirming anonymous access.</returns>
        [HttpGet("anonymous")]
        [AllowAnonymous]
        public IActionResult Anonymous()
        {
            return Ok(new { message = "This endpoint is accessible without authentication" });
        }

        /// <summary>
        /// Endpoint requiring any valid authentication.
        /// </summary>
        /// <returns>User information and all claims from the token.</returns>
        [HttpGet("authenticated")]
        [Authorize]
        public IActionResult Authenticated()
        {
            var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
            return Ok(new
            {
                message = "You are authenticated",
                userId = User.Identity?.Name,
                isAuthenticated = User.Identity?.IsAuthenticated,
                authenticationType = User.Identity?.AuthenticationType,
                claims
            });
        }

        /// <summary>
        /// Endpoint requiring GlobalAdministrator role.
        /// </summary>
        /// <returns>A message confirming admin access.</returns>
        [HttpGet("admin")]
        [Authorize(Policy = "GlobalAdministrator")]
        public IActionResult AdminOnly()
        {
            return Ok(new
            {
                message = "You have GlobalAdministrator access",
                userId = User.Identity?.Name
            });
        }

        /// <summary>
        /// Endpoint requiring DatacenterTechnician role.
        /// </summary>
        /// <returns>A message confirming technician access.</returns>
        [HttpGet("technician")]
        [Authorize(Policy = "DatacenterTechnician")]
        public IActionResult TechnicianOnly()
        {
            return Ok(new
            {
                message = "You have DatacenterTechnician access",
                userId = User.Identity?.Name
            });
        }

        /// <summary>
        /// Endpoint requiring WorkspaceManager role.
        /// </summary>
        /// <returns>A message confirming manager access.</returns>
        [HttpGet("manager")]
        [Authorize(Policy = "WorkspaceManager")]
        public IActionResult ManagerOnly()
        {
            return Ok(new
            {
                message = "You have WorkspaceManager access",
                userId = User.Identity?.Name
            });
        }

        /// <summary>
        /// Endpoint requiring WorkspaceUser role.
        /// </summary>
        /// <returns>A message confirming user access.</returns>
        [HttpGet("user")]
        [Authorize(Policy = "WorkspaceUser")]
        public IActionResult UserOnly()
        {
            return Ok(new
            {
                message = "You have WorkspaceUser access",
                userId = User.Identity?.Name
            });
        }
    }
}
