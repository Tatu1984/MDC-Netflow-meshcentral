using MDC.Core.Services.Providers.ProxmoxDatacenterManager;
using MDC.Core.Services.Providers.ProxmoxDatacenterManager.Dto;
using MDC.Core.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MDC.Api.Controllers
{
    /// <summary>
    /// Fleet observability read-through over Proxmox Datacenter Manager.
    /// Phase-1 thin slice: admin-tier read endpoints backed by a mock PDM client in local dev.
    /// </summary>
    [ApiController]
    [Route("api/observability")]
    [Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
    public class ObservabilityController : ControllerBase
    {
        private readonly IPdmClient _pdm;
        private readonly PdmTelemetryCache _cache;
        private readonly PdmClientOptions _options;
        private readonly ITierResolver _tier;
        private readonly IVmWorkspaceMap _vmMap;
        private readonly ILogger<ObservabilityController> _logger;

        /// <summary>Construct the controller with the PDM client and cache dependencies.</summary>
        public ObservabilityController(
            IPdmClient pdm,
            PdmTelemetryCache cache,
            IOptions<PdmClientOptions> options,
            ITierResolver tier,
            IVmWorkspaceMap vmMap,
            ILogger<ObservabilityController> logger)
        {
            _pdm = pdm;
            _cache = cache;
            _options = options.Value;
            _tier = tier;
            _vmMap = vmMap;
            _logger = logger;
        }

        /// <summary>Reachability probe. Also reports whether the mock backend is in use.</summary>
        [HttpGet("status")]
        [AllowAnonymous]
        public async Task<IActionResult> StatusAsync(CancellationToken ct)
        {
            var reachable = await _pdm.PingAsync(ct);
            return Ok(new
            {
                reachable,
                mode = _options.UseMock ? "mock" : "live",
                metricsCacheSeconds = _options.MetricsCacheSeconds,
                inventoryCacheSeconds = _options.InventoryCacheSeconds,
                serverTimeUtc = DateTime.UtcNow
            });
        }

        /// <summary>All clusters known to PDM with aggregate health.</summary>
        [HttpGet("fleet")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<ActionResult<IReadOnlyList<PdmCluster>>> FleetAsync(CancellationToken ct)
        {
            var clusters = await _cache.GetOrFetchAsync(
                "pdm:clusters",
                TimeSpan.FromSeconds(_options.InventoryCacheSeconds),
                () => _pdm.ListClustersAsync(ct));
            return Ok(clusters);
        }

        /// <summary>Nodes within a cluster.</summary>
        [HttpGet("clusters/{clusterId}/nodes")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<ActionResult<IReadOnlyList<PdmNode>>> NodesAsync(string clusterId, CancellationToken ct)
        {
            var nodes = await _cache.GetOrFetchAsync(
                $"pdm:nodes:{clusterId}",
                TimeSpan.FromSeconds(_options.InventoryCacheSeconds),
                () => _pdm.ListNodesAsync(clusterId, ct));
            return Ok(nodes);
        }

        /// <summary>VMs within a cluster.</summary>
        [HttpGet("clusters/{clusterId}/vms")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<ActionResult<IReadOnlyList<PdmVm>>> VmsAsync(string clusterId, CancellationToken ct)
        {
            var vms = await _cache.GetOrFetchAsync(
                $"pdm:vms:{clusterId}",
                TimeSpan.FromSeconds(_options.InventoryCacheSeconds),
                () => _pdm.ListVmsAsync(clusterId, ct));
            return Ok(vms);
        }

        /// <summary>Live metrics for a single node.</summary>
        [HttpGet("nodes/{nodeId}/metrics")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<ActionResult<PdmMetricsSample>> NodeMetricsAsync(string nodeId, CancellationToken ct)
        {
            var sample = await _cache.GetOrFetchAsync(
                $"pdm:node-metrics:{nodeId}",
                TimeSpan.FromSeconds(_options.MetricsCacheSeconds),
                () => _pdm.GetNodeMetricsAsync(nodeId, ct));
            return Ok(sample);
        }

        /// <summary>Recent PDM events.</summary>
        [HttpGet("events")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<ActionResult<IReadOnlyList<PdmEvent>>> EventsAsync([FromQuery] int take = 50, CancellationToken ct = default)
        {
            var events = await _cache.GetOrFetchAsync(
                $"pdm:events:{take}",
                TimeSpan.FromSeconds(10),
                () => _pdm.GetRecentEventsAsync(take, ct));
            return Ok(events);
        }

        /// <summary>Storage pools across the fleet.</summary>
        [HttpGet("storage")]
        [Authorize(Policy = "GlobalAdministrator")]
        public async Task<ActionResult<IReadOnlyList<PdmStoragePool>>> StorageAsync(CancellationToken ct = default)
        {
            var pools = await _cache.GetOrFetchAsync(
                "pdm:storage",
                TimeSpan.FromSeconds(_options.InventoryCacheSeconds),
                () => _pdm.ListStoragePoolsAsync(ct));
            return Ok(pools);
        }

        // ---------------------------------------------------------------
        //  User-tier endpoints (Phase 2). Enforced server-side via TierResolver.
        // ---------------------------------------------------------------

        /// <summary>
        /// VMs in the given workspace with their latest metrics. Workspace-member tier
        /// must belong to <paramref name="wsId"/>; admins see any workspace.
        /// </summary>
        [HttpGet("workspaces/{wsId}/vms")]
        [Authorize(Policy = "WorkspaceUser")]
        public async Task<IActionResult> WorkspaceVmsAsync(string wsId, CancellationToken ct = default)
        {
            var tier = await _tier.ResolveAsync(User, ct);
            if (tier.Kind == TierKind.WorkspaceMember && !tier.WorkspaceIds.Contains(wsId, StringComparer.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Tier block: user not a member of {WorkspaceId}", wsId);
                return Forbid();
            }

            var map = await _vmMap.ListAsync(ct);
            var wsVms = map.Where(x => string.Equals(x.WorkspaceId, wsId, StringComparison.OrdinalIgnoreCase)).ToList();

            var result = new List<object>();
            foreach (var vm in wsVms)
            {
                var metrics = await _cache.GetOrFetchAsync(
                    $"pdm:vm-metrics:{vm.ClusterId}:{vm.Vmid}",
                    TimeSpan.FromSeconds(_options.MetricsCacheSeconds),
                    () => _pdm.GetVmMetricsAsync(vm.ClusterId, vm.Vmid, ct));
                result.Add(new { vmid = vm.Vmid, clusterId = vm.ClusterId, workspaceId = vm.WorkspaceId, metrics });
            }
            return Ok(new { workspaceId = wsId, count = result.Count, vms = result });
        }

        /// <summary>
        /// Live metrics for a single VM. Returns 404 if the VM is unknown and
        /// 403 if it is not in one of the caller's workspaces.
        /// </summary>
        [HttpGet("vms/{vmid:int}/metrics")]
        [Authorize(Policy = "WorkspaceUser")]
        public async Task<IActionResult> VmMetricsAsync(int vmid, CancellationToken ct = default)
        {
            var loc = await _vmMap.GetAsync(vmid, ct);
            if (loc is null)
            {
                return NotFound();
            }

            var tier = await _tier.ResolveAsync(User, ct);
            if (tier.Kind == TierKind.WorkspaceMember && !tier.WorkspaceIds.Contains(loc.WorkspaceId, StringComparer.OrdinalIgnoreCase))
            {
                return Forbid();
            }

            var metrics = await _cache.GetOrFetchAsync(
                $"pdm:vm-metrics:{loc.ClusterId}:{loc.Vmid}",
                TimeSpan.FromSeconds(_options.MetricsCacheSeconds),
                () => _pdm.GetVmMetricsAsync(loc.ClusterId, loc.Vmid, ct));

            return Ok(new { vmid = loc.Vmid, clusterId = loc.ClusterId, workspaceId = loc.WorkspaceId, metrics });
        }

        /// <summary>Workspaces the caller belongs to (or all, for admins).</summary>
        [HttpGet("my-workspaces")]
        [Authorize(Policy = "WorkspaceUser")]
        public async Task<IActionResult> MyWorkspacesAsync(CancellationToken ct = default)
        {
            var tier = await _tier.ResolveAsync(User, ct);
            if (tier.Kind == TierKind.Admin)
            {
                var all = await _vmMap.ListAsync(ct);
                return Ok(new { tier = "admin", workspaceIds = all.Select(x => x.WorkspaceId).Distinct().OrderBy(x => x).ToArray() });
            }
            return Ok(new { tier = "workspace", workspaceIds = tier.WorkspaceIds });
        }
    }
}
