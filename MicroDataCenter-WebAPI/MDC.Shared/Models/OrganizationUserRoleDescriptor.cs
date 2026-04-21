namespace MDC.Shared.Models;

/// <summary />
public class OrganizationUserRoleDescriptor
{
    /// <summary />
    public required string Role { get; set; }

    /// <summary />
    public required Guid UserId { get; set; }
}
