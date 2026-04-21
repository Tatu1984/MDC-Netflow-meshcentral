namespace MDC.Shared.Models;

/// <summary/>
public class RunCommandDescriptor
{
    /// <summary/>
    public required int VirtualMachineIndex { get; set; }

    /// <summary/>
    public required string[] Commands { get; set; }
}
