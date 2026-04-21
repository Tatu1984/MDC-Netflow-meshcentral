using MDC.Core.Services.Providers.PVEClient;

namespace MDC.Core.Models;

internal class NodeEntry
{
    public required PVEResource PVEResource { get; set; }

    public required PVEClusterStatus PVEClusterStatus { get; set; }

    public required PVENodeStatus PVENodeStatus { get; set; }
}
