namespace MDC.Shared.Models;

/// <summary />
public class SiteDescriptor
{
    /// <summary />
    public required string MemberAddress { get; set; }

    /// <summary />
    public required string SerialNumber { get; set; }

    /// <summary />
    public required Guid MachineId { get; set; }

    /// <summary />
    public required string RegistrationUserName { get; set; }

    /// <summary />
    public required string RegistrationPassword { get; set; }

    /// <summary />
    public string? Description { get; set; }

    /// <summary />
    public bool ValidateServerCertificate { get; set; } // Default to validating server certificate

    /// <summary />
    public int? Port { get; set; } // Default Proxmox VE API port

    /// <summary />
    public int? Timeout { get; set; } // Default timeout in seconds is 30 seconds

    /// <summary />
    public Guid[]? OrganizationIds { get; set; }

    /// <summary />
    public Guid? ImportToOrganizationId { get; set; }

    /// <summary />
    public bool? DataEgressOnMgmtNetwork {  get; set; }
}
