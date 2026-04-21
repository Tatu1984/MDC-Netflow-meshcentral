using System.Collections.Concurrent;

namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager;

/// <summary>
/// Deterministic VM → cluster → workspace map layered with a runtime registry
/// of VMs created after startup. In real mode, this responsibility is served
/// by the MDC database + PVE cluster resources.
/// </summary>
public sealed class MockVmWorkspaceMap : IVmWorkspaceMap
{
    private static readonly IReadOnlyDictionary<string, string> ClusterToWorkspace
        = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["cluster-alpha"] = "ws-alpha",
            ["cluster-beta"]  = "ws-beta",
            ["cluster-gamma"] = "ws-gamma",
        };

    private static readonly IReadOnlyDictionary<string, string> WorkspaceToCluster
        = ClusterToWorkspace.ToDictionary(kv => kv.Value, kv => kv.Key, StringComparer.OrdinalIgnoreCase);

    private readonly IPdmClient _pdm;
    private readonly ConcurrentDictionary<int, VmLocation> _runtimeVms = new();

    /// <summary>Construct with the PDM client used to list baseline VMs per cluster.</summary>
    public MockVmWorkspaceMap(IPdmClient pdm)
    {
        _pdm = pdm;
    }

    /// <summary>
    /// Register a newly-created VM in a workspace. Returns the assigned VMID and
    /// cluster. Used by the dev-only VM creation endpoint to simulate PVE.
    /// </summary>
    public VmLocation RegisterVm(int vmid, string workspaceId)
    {
        if (!WorkspaceToCluster.TryGetValue(workspaceId, out var clusterId))
        {
            throw new InvalidOperationException($"Unknown workspace id: {workspaceId}");
        }
        var loc = new VmLocation(vmid, clusterId, workspaceId);
        _runtimeVms[vmid] = loc;
        return loc;
    }

    /// <summary>Allocate a VMID that doesn't collide with the baseline or other runtime entries.</summary>
    public int AllocateVmid(string workspaceId)
    {
        // Runtime VMs start at 9000 to avoid colliding with the baseline (100s/200s/300s).
        var baseId = 9000;
        lock (_runtimeVms)
        {
            while (_runtimeVms.ContainsKey(baseId)) baseId++;
            return baseId;
        }
    }

    /// <summary>
    /// The subset of VMs that were added at runtime (simulating new cloud-init
    /// boots). The mock enrollment reconciler scopes its auto-enrolment to this
    /// set so Phase 4 baseline fixtures (e.g. the intentionally un-enrolled
    /// vmid 103) remain deterministic.
    /// </summary>
    public IReadOnlyCollection<VmLocation> GetRuntimeVms() => _runtimeVms.Values.ToArray();

    /// <inheritdoc />
    public async Task<VmLocation?> GetAsync(int vmid, CancellationToken ct = default)
    {
        if (_runtimeVms.TryGetValue(vmid, out var loc)) return loc;
        var all = await ListAsync(ct).ConfigureAwait(false);
        return all.FirstOrDefault(x => x.Vmid == vmid);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<VmLocation>> ListAsync(CancellationToken ct = default)
    {
        var result = new List<VmLocation>();
        foreach (var kv in ClusterToWorkspace)
        {
            var vms = await _pdm.ListVmsAsync(kv.Key, ct).ConfigureAwait(false);
            foreach (var vm in vms)
            {
                result.Add(new VmLocation(vm.Vmid, kv.Key, kv.Value));
            }
        }
        // Layer in any runtime-added VMs.
        foreach (var kv in _runtimeVms)
        {
            if (!result.Any(r => r.Vmid == kv.Key))
            {
                result.Add(kv.Value);
            }
        }
        return result;
    }
}
