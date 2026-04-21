namespace MDC.Shared.Models;

/// <summary />
public class OrganizationUpdateDescriptor
{
    /// <summary />
    public string? Name { get; set; }

    /// <summary />
    public string? Description { get; set; }

    /// <summary />
    public OrganizationUserRoleDescriptor[]? AddOrganizationUserRoles { get; set; }

    /// <summary />
    public OrganizationUserRoleDescriptor[]? RemoveOrganizationUserRoles { get; set; }

    /// <summary />
    public Guid[]? AddSiteIds { get; set; }

    /// <summary />
    public Guid[]? RemoveSiteIds { get; set; }
}
