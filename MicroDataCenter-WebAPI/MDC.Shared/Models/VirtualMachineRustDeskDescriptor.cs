using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary />
public class VirtualMachineRustDeskDescriptor
{
    /// <summary />
    public bool? Enable { get; set; }

    /// <summary />
    public string? PermanentPassword {get; set;}

    /// <summary />
    public string? RustDeskId { get; set; }
}
