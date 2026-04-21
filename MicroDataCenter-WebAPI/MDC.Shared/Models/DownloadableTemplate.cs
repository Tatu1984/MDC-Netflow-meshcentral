namespace MDC.Shared.Models;

/// <summary/>
public class DownloadableTemplate : VirtualMachineTemplate
{
    /// <summary/>
    public required long? Size { get; set; }

    /// <summary/>
    public required string Type { get; set; }

    /// <summary/>
    public required bool Downloaded { get; set; }

    /// <summary/>
    public required string Digest { get; set; }
}
