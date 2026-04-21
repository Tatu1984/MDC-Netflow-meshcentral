namespace MDC.Shared.Models;

/// <summary/>
public class DatacenterNode
{
    /// <summary/>
    public required string Node { get; set; }

    /// <summary/>
    public required DatacenterNodeCPUInfo CPUInfo { get; set; }
}
