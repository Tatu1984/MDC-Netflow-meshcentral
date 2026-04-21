using MDC.Core.Services.Providers.ProxmoxDatacenterManager;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MDC.Core.Services.Providers.MeshCentral;

/// <summary>
/// Reconciles the VM inventory to MeshCentral's device registry.
///
/// In production, the agent installs itself from cloud-init and registers with
/// MeshCentral on first boot; this service watches for drift (VMs with no
/// agent, stale agents for deleted VMs) and surfaces it.
///
/// In the local mock, we simulate agent self-registration here so the audit
/// can exercise the end-to-end "create VM → Remote Connect works" flow without
/// a real Proxmox cloud-init pipeline.
/// </summary>
public sealed class MeshAgentEnrollmentService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly MeshCentralOptions _options;
    private readonly ILogger<MeshAgentEnrollmentService> _logger;
    private readonly TimeSpan _interval;

    /// <summary>Construct with DI dependencies.</summary>
    public MeshAgentEnrollmentService(
        IServiceScopeFactory scopeFactory,
        IOptions<MeshCentralOptions> options,
        ILogger<MeshAgentEnrollmentService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
        _interval = TimeSpan.FromSeconds(Math.Max(1, _options.EnrollmentReconcileSeconds));
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Mesh enrollment reconciler starting — interval {Interval}s, mock={UseMock}",
            _interval.TotalSeconds, _options.UseMock);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ReconcileOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Mesh enrollment reconcile failed");
            }
            try
            {
                await Task.Delay(_interval, stoppingToken);
            }
            catch (OperationCanceledException) { break; }
        }
    }

    /// <summary>One reconcile pass — exposed so tests can trigger without waiting.</summary>
    public async Task<ReconcileReport> ReconcileOnceAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var vmMap = scope.ServiceProvider.GetRequiredService<IVmWorkspaceMap>();
        var meshClient = scope.ServiceProvider.GetRequiredService<IMeshCentralClient>();

        var vms = await vmMap.ListAsync(ct);
        var devices = await meshClient.ListDevicesAsync(ct);
        var knownVmids = new HashSet<int>(devices
            .Select(d => d.NodeId.StartsWith("mesh-n-", StringComparison.Ordinal)
                ? int.TryParse(d.NodeId.AsSpan("mesh-n-".Length), out var v) ? v : -1
                : -1)
            .Where(v => v >= 0));

        var toEnrol = vms.Where(v => !knownVmids.Contains(v.Vmid)).ToList();
        var toRemove = devices.Where(d =>
        {
            if (!d.NodeId.StartsWith("mesh-n-", StringComparison.Ordinal)) return false;
            if (!int.TryParse(d.NodeId.AsSpan("mesh-n-".Length), out var v)) return false;
            return vms.All(vm => vm.Vmid != v);
        }).ToList();

        var enroled = 0;
        if (_options.UseMock && meshClient is MockMeshCentralClient mock && vmMap is MockVmWorkspaceMap mockMap)
        {
            // In mock mode we only auto-enrol VMs that were added at runtime
            // (simulating new cloud-init boots). The static baseline inventory
            // represents whatever state the operator left the fleet in; we
            // don't manufacture agents for it on startup.
            var runtimeVmids = mockMap.GetRuntimeVms().Select(v => v.Vmid).ToHashSet();
            foreach (var vm in toEnrol.Where(v => runtimeVmids.Contains(v.Vmid)))
            {
                mock.RegisterDevice(vm.Vmid, vm.WorkspaceId, $"vm-{vm.Vmid}");
                enroled++;
                _logger.LogInformation(
                    "Mock-enroled vmid {Vmid} in workspace {Workspace}",
                    vm.Vmid, vm.WorkspaceId);
            }
        }
        else if (toEnrol.Count > 0)
        {
            _logger.LogWarning(
                "Drift: {Count} VMs have no Mesh agent. In production these should self-enrol via cloud-init.",
                toEnrol.Count);
        }

        return new ReconcileReport(toEnrol.Count, enroled, toRemove.Count);
    }
}

/// <summary>Summary of what one reconcile pass did.</summary>
/// <param name="Drifted">VMs that had no Mesh agent before this pass.</param>
/// <param name="Enroled">VMs that were auto-enroled in this pass (mock only).</param>
/// <param name="Orphaned">Mesh devices whose VM no longer exists.</param>
public sealed record ReconcileReport(int Drifted, int Enroled, int Orphaned);
