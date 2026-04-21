namespace MDC.Shared.Models;

/// <summary />
public class OrganizationDescriptor
{
    /// <summary />
    public required string Name { get; set; }

    /// <summary />
    public string? Description { get; set; }

    /// <summary />
    public OrganizationUserRoleDescriptor[]? OrganizationUserRoles { get; set; }

    /// <summary />
    public Guid[]? SiteIds { get; set; }
}
