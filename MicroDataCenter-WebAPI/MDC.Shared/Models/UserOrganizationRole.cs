namespace MDC.Shared.Models;

/// <summary />
public class UserOrganizationRole
{
    /// <summary />
    public Guid OrganizationId { get; set; }

    /// <summary />
    public required string Role { get; set; }
}
