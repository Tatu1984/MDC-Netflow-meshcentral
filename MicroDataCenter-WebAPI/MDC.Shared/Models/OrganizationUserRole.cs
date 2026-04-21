namespace MDC.Shared.Models;

/// <summary />
public class OrganizationUserRole
{
    /// <summary />
    public Guid OrganizationId { get; set; }

    /// <summary />
    public required string OrganizationName { get; set; }

    /// <summary />
    public required string Role { get; set; }

    /// <summary />
    public required Guid UserId { get; set; }
}
