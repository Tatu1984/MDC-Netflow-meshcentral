namespace MDC.Shared.Models;

/// <summary />
public class SiteNodeRegistration
{
    /// <summary />
    public required Guid Id { get; set; }

    /// <summary />
    public required Guid UUID { get; set; }

    /// <summary />
    public required string SerialNumber { get; set; }

    /// <summary />
    public required string? MemberAddress { get; set; }

    /// <summary />
    public required DateTime CreatedAt { get; set; }

    /// <summary />
    public DateTime? CompletedAt { get; set; }

    /// <summary />
    public string? DeviceInfo { get; set; }

    /// <summary />
    public bool? Online { get; set; }

    /// <summary />
    public bool? Authorized { get; set; }

    ///// <summary />
    //public bool? Configured { get; set; }

    ///// <summary />
    //public string? SiteNodeName { get; set; }

    /// <summary />
    public Guid? SiteId { get; set; }

    /// <summary />
    public Guid? SiteNodeId { get; set; }
}
