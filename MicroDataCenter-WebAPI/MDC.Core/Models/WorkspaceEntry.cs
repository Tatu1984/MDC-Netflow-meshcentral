using MDC.Core.Services.Providers.MDCDatabase;

namespace MDC.Core.Models;

internal class WorkspaceEntry
{
    public required int Address { get; set; }

    public required string Name { get; set; }

    public required bool Locked { get; set; }

    public DbWorkspace? DbWorkspace { get; set; } = null;

    public List<VirtualNetworkEntry> VirtualNetworks { get; set; } = new List<VirtualNetworkEntry>();

    public List<VirtualMachineEntry> VirtualMachines { get; set; } = new List<VirtualMachineEntry>();

    public IEnumerable<ResourceEntry> ResourceEntries
    {
        get
        {
            var resources = new List<ResourceEntry>();
            resources.AddRange(VirtualNetworks);
            resources.AddRange(VirtualMachines);
            return resources;
        }
    }

    public WorkspaceDescriptor? WorkspaceDescriptor { get; set; } = null;
}
