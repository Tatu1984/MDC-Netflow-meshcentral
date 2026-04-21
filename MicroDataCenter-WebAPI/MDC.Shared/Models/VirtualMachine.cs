namespace MDC.Shared.Models;

/// <summary/>
public class VirtualMachine
{
    /// <summary/>
    public required int Index { get; set; }

    /// <summary/>
    public required string Name { get; set; }

    /// <summary/>
    public required string? Status { get; set; }

    /// <summary/>
    public required int? Cores { get; set; }

    /// <summary/>
    public required string? Memory { get; set; }

    /// <summary/>
    public required string? TemplateName { get; set; }

    /// <summary/>
    public required int? TemplateRevision { get; set; }

    /// <summary/>
    public string? RustDeskId { get; set; }

    /// <summary/>
    public required VirtualMachineStorage[] Storage { get; set; }

    /// <summary/>
    public required VirtualMachineNetworkAdapter[]? NetworkAdapters { get; set; }
}
