using MDC.Core.Services.Providers.MeshCentral;
using MDC.Core.Services.Providers.ProxmoxDatacenterManager;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// Trust-broker endpoints for MeshCentral remote connectivity (Phase 4).
    /// Short-lived login URLs are minted server-side; service credentials never
    /// reach the browser.
    /// </summary>
    [ApiController]
    [Route("api/mesh")]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class MeshController : ControllerBase
    {
        private readonly MeshSessionBroker _broker;
        private readonly IMeshCentralClient _mesh;
        private readonly ILogger<MeshController> _logger;

        /// <summary>Construct with Mesh broker and client dependencies.</summary>
        public MeshController(MeshSessionBroker broker, IMeshCentralClient mesh, ILogger<MeshController> logger)
        {
            _broker = broker;
            _mesh = mesh;
            _logger = logger;
        }

        /// <summary>
        /// Mint a short-lived login URL for a VM. Enforces tier rules and agent
        /// availability. Returns:
        ///   200 { url, expiresAtUtc, nodeId, workspaceId } on success,
        ///   403 if the caller is not a member of the VM's workspace,
        ///   404 if the VM is unknown,
        ///   503 with { fallback: "vnc", reason } when the agent is not enrolled or offline.
        /// </summary>
        [HttpPost("vms/{vmid:int}/session")]
        [Authorize(Policy = "WorkspaceUser")]
        public async Task<IActionResult> CreateSessionAsync(int vmid, CancellationToken ct = default)
        {
            var result = await _broker.CreateSessionAsync(User, vmid, ct);
            return result.Outcome switch
            {
                MeshSessionOutcome.Ok => Ok(new
                {
                    url = result.Ticket!.Url,
                    token = result.Ticket.Token,
                    expiresAtUtc = result.Ticket.ExpiresAtUtc,
                    nodeId = result.Ticket.NodeId,
                    workspaceId = result.WorkspaceId,
                }),
                MeshSessionOutcome.VmNotFound      => NotFound(new { error = "unknown vm" }),
                MeshSessionOutcome.Forbidden       => StatusCode(403, new { error = "not a member of workspace", workspaceId = result.WorkspaceId }),
                MeshSessionOutcome.AgentNotEnrolled => StatusCode(503, new { error = "mesh agent not enrolled", fallback = "vnc" }),
                MeshSessionOutcome.AgentOffline    => StatusCode(503, new { error = "mesh agent offline", fallback = "vnc" }),
                _ => StatusCode(500),
            };
        }

        /// <summary>Report Mesh agent status (online / offline / not enrolled) for a VM.</summary>
        [HttpGet("vms/{vmid:int}/status")]
        [Authorize(Policy = "WorkspaceUser")]
        public async Task<IActionResult> StatusAsync(int vmid, CancellationToken ct = default)
        {
            var device = await _broker.GetStatusAsync(vmid, ct);
            if (device is null)
            {
                return Ok(new { vmid, enrolled = false, online = false });
            }
            return Ok(new
            {
                vmid,
                enrolled = true,
                online = device.Online,
                nodeId = device.NodeId,
                agentVersion = device.AgentVersion,
                lastSeenUtc = device.LastSeenUtc,
            });
        }

        /// <summary>List all Mesh-known devices (admin only).</summary>
        [HttpGet("devices")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<IActionResult> DevicesAsync(CancellationToken ct = default)
        {
            var devices = await _mesh.ListDevicesAsync(ct);
            return Ok(devices);
        }

        /// <summary>
        /// Preview the cloud-init user-data that will be injected at VM creation
        /// for auto-enrollment. This is what the real PVE integration will
        /// attach to a new VM's cloud-init config drive.
        /// </summary>
        [HttpGet("cloud-init-preview")]
        [Authorize(Policy = "GlobalAdministrator")]
        public IActionResult CloudInitPreviewAsync(
            [FromQuery] string workspaceId,
            [FromQuery] int vmid,
            [FromServices] IOptions<MeshCentralOptions> options)
        {
            var opts = options.Value;
            var baseUrl = opts.BaseUrl ?? "/mock-mesh";
            var yaml = CloudInitTemplate.Render(baseUrl, workspaceId, opts.EnrollmentGroupPrefix, vmid);
            return Content(yaml, "text/yaml; charset=utf-8");
        }

        /// <summary>
        /// Force the enrollment reconciler to run immediately and return what
        /// changed. Useful for tests and operators after a bulk VM create.
        /// </summary>
        [HttpPost("reconcile")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<IActionResult> ReconcileNowAsync(
            [FromServices] MeshAgentEnrollmentService reconciler,
            CancellationToken ct = default)
        {
            var report = await reconciler.ReconcileOnceAsync(ct);
            return Ok(report);
        }
    }

    /// <summary>
    /// Development-only helper to simulate VM creation. In production this
    /// role is served by the Workspaces / VirtualMachines controllers that
    /// drive real PVE. Available only when <c>Pdm:UseMock=true</c>.
    /// </summary>
    [ApiController]
    [Route("api/mock-vms")]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class MockVmController : ControllerBase
    {
        private readonly IVmWorkspaceMap _vmMap;
        private readonly MeshAgentEnrollmentService _reconciler;
        private readonly ILogger<MockVmController> _logger;

        /// <summary>Construct with the VM map and enrollment reconciler.</summary>
        public MockVmController(IVmWorkspaceMap vmMap, MeshAgentEnrollmentService reconciler, ILogger<MockVmController> logger)
        {
            _vmMap = vmMap;
            _reconciler = reconciler;
            _logger = logger;
        }

        /// <summary>Describes a simulated VM creation request.</summary>
        /// <param name="WorkspaceId">Target MDC workspace id.</param>
        public sealed record MockVmCreateRequest(string WorkspaceId);

        /// <summary>Create a fake VM in the given workspace and kick off enrollment.</summary>
        [HttpPost]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<IActionResult> CreateAsync([FromBody] MockVmCreateRequest req, CancellationToken ct = default)
        {
            if (_vmMap is not MockVmWorkspaceMap mockMap)
            {
                return StatusCode(501, new { error = "Mock VM creation only available in mock mode" });
            }
            var vmid = mockMap.AllocateVmid(req.WorkspaceId);
            var loc = mockMap.RegisterVm(vmid, req.WorkspaceId);

            _logger.LogInformation("Mock VM created: vmid {Vmid} in workspace {Workspace}", vmid, loc.WorkspaceId);

            // Kick off enrollment reconcile immediately so callers don't have to
            // wait for the next timer tick.
            var report = await _reconciler.ReconcileOnceAsync(ct);

            return Ok(new
            {
                vmid,
                clusterId = loc.ClusterId,
                workspaceId = loc.WorkspaceId,
                enrollment = report,
            });
        }
    }

    /// <summary>
    /// Local-dev-only mock MeshCentral web endpoint. Validates a token that was
    /// previously minted by <see cref="MockMeshCentralClient"/> and returns a
    /// simple HTML page that stands in for the MeshCentral remote-desktop UI.
    /// In production this endpoint is replaced by the real MeshCentral server.
    /// </summary>
    [ApiController]
    [Route("mock-mesh")]
    [AllowAnonymous]
    public class MockMeshWebController : ControllerBase
    {
        private readonly IMeshCentralClient _mesh;

        /// <summary>Construct with the Mesh client (the mock variant exposes ticket redemption).</summary>
        public MockMeshWebController(IMeshCentralClient mesh)
        {
            _mesh = mesh;
        }

        /// <summary>Redeem a ticket and render a fake remote-desktop page.</summary>
        [HttpGet("session/{token}")]
        public IActionResult RedeemSession(string token)
        {
            if (!_mesh.TryRedeemTicket(token, out var device) || device is null)
            {
                Response.StatusCode = 404;
                return Content("<html><body><h1>MeshCentral session invalid or expired</h1></body></html>", "text/html; charset=utf-8");
            }
            var html = $@"<!doctype html>
<html><head><title>MeshCentral — {System.Net.WebUtility.HtmlEncode(device.Name)}</title></head>
<body style=""font-family:sans-serif;background:#111;color:#e6e6e6;padding:2rem"">
  <h1 data-testid=""mesh-session-heading"">Remote Desktop Session Active</h1>
  <p>Node: <code>{System.Net.WebUtility.HtmlEncode(device.NodeId)}</code></p>
  <p>Name: <code>{System.Net.WebUtility.HtmlEncode(device.Name)}</code></p>
  <p>Agent version: <code>{System.Net.WebUtility.HtmlEncode(device.AgentVersion)}</code></p>
  <p>This stand-in represents the real MeshCentral web console that a user would see in production.</p>
</body></html>";
            return Content(html, "text/html; charset=utf-8");
        }
    }
}
