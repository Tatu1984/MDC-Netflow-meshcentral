using MDC.Core.Services.Providers.NetFlow;
using MDC.Core.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// NetFlow read API (Phase 6). Tier enforcement is server-side: every
    /// non-admin query is rewritten to the caller's workspace memberships and
    /// physical-interface records are stripped before the response leaves the
    /// controller.
    /// </summary>
    [ApiController]
    [Route("api/flows")]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class FlowsController : ControllerBase
    {
        private readonly FlowQueryService _query;
        private readonly IFlowSource _source;
        private readonly ITierResolver _tier;
        private readonly ILogger<FlowsController> _logger;

        /// <summary>Construct with the query service, flow source, and tier resolver.</summary>
        public FlowsController(FlowQueryService query, IFlowSource source, ITierResolver tier, ILogger<FlowsController> logger)
        {
            _query = query;
            _source = source;
            _tier = tier;
            _logger = logger;
        }

        private async Task<IActionResult?> RejectIfOutOfTierAsync(string? workspaceId, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(workspaceId)) return null;
            var tier = await _tier.ResolveAsync(User, ct);
            if (tier.Kind == TierKind.WorkspaceMember &&
                !tier.WorkspaceIds.Contains(workspaceId, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(403, new { error = "not a member of workspace", workspaceId });
            }
            return null;
        }

        /// <summary>
        /// Paginated flow records. User tier is implicitly scoped to own
        /// workspaces + virtual interfaces only; admin tier can pass
        /// <c>includePhysical=true</c> to see physical-NIC flows.
        /// </summary>
        [HttpGet]
        [Authorize(Policy = "WorkspaceUser")]
        public async Task<IActionResult> IndexAsync(
            [FromQuery] string? workspaceId,
            [FromQuery] int? vmId,
            [FromQuery] string? observationPoint,
            [FromQuery] bool includePhysical = false,
            [FromQuery] int windowSeconds = 300,
            [FromQuery] int take = 100,
            CancellationToken ct = default)
        {
            if (await RejectIfOutOfTierAsync(workspaceId, ct) is { } reject) return reject;
            var q = new FlowQueryService.FlowQuery(workspaceId, vmId, observationPoint, includePhysical, windowSeconds, take);
            var r = await _query.QueryAsync(User, q, ct);
            return Ok(r);
        }

        /// <summary>Top talkers grouped by observation point.</summary>
        [HttpGet("top-talkers")]
        [Authorize(Policy = "WorkspaceUser")]
        public async Task<IActionResult> TopTalkersAsync(
            [FromQuery] string? workspaceId,
            [FromQuery] int? vmId,
            [FromQuery] bool includePhysical = false,
            [FromQuery] int windowSeconds = 300,
            [FromQuery] int n = 10,
            CancellationToken ct = default)
        {
            if (await RejectIfOutOfTierAsync(workspaceId, ct) is { } reject) return reject;
            var q = new FlowQueryService.FlowQuery(workspaceId, vmId, null, includePhysical, windowSeconds, int.MaxValue);
            var talkers = await _query.TopTalkersAsync(User, q, n, ct);
            return Ok(talkers);
        }

        /// <summary>Virtual interfaces the caller can see for a given workspace.</summary>
        [HttpGet("workspaces/{workspaceId}/interfaces")]
        [Authorize(Policy = "WorkspaceUser")]
        public async Task<IActionResult> WorkspaceInterfacesAsync(string workspaceId, CancellationToken ct = default)
        {
            if (await RejectIfOutOfTierAsync(workspaceId, ct) is { } reject) return reject;
            var list = await _query.WorkspaceInterfacesAsync(User, workspaceId, ct);
            return Ok(list);
        }

        /// <summary>Flows observed on a specific VM (within tier scope).</summary>
        [HttpGet("by-vm/{vmId:int}")]
        [Authorize(Policy = "WorkspaceUser")]
        public async Task<IActionResult> ByVmAsync(int vmId, [FromQuery] int windowSeconds = 300, [FromQuery] int take = 100, CancellationToken ct = default)
        {
            var q = new FlowQueryService.FlowQuery(null, vmId, null, false, windowSeconds, take);
            var r = await _query.QueryAsync(User, q, ct);
            return Ok(r);
        }

        /// <summary>Physical-interface flows (admin tier only).</summary>
        [HttpGet("physical")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<IActionResult> PhysicalAsync([FromQuery] int windowSeconds = 300, [FromQuery] int take = 100, CancellationToken ct = default)
        {
            var q = new FlowQueryService.FlowQuery(null, null, null, true, windowSeconds, int.MaxValue);
            var all = await _query.QueryAsync(User, q, ct);
            var physical = all.Records.Where(r => r.IsPhysicalInterface).Take(take).ToArray();
            return Ok(new FlowResult(all.Tier, physical, physical.Length));
        }

        /// <summary>Registered exporters (admin tier only).</summary>
        [HttpGet("exporters")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<IActionResult> ExportersAsync(CancellationToken ct = default)
        {
            var exporters = await _source.ListExportersAsync(ct);
            return Ok(exporters);
        }

        /// <summary>
        /// Per-collector health (admin tier only). Shows every central / edge
        /// collector contributing to the federation, whether it's reachable,
        /// and how many records it holds.
        /// </summary>
        [HttpGet("collectors")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<IActionResult> CollectorsAsync([FromServices] FederatedFlowSource federated, CancellationToken ct = default)
        {
            var health = await federated.HealthAsync(ct);
            return Ok(health);
        }
    }
}
