namespace MDC.Shared.Models;

/// <summary />
public class Organization
{
    /// <summary />
    public required Guid Id { get; set; }

    /// <summary />
    public required string Name { get; set; }

    /// <summary />
    public required string Description { get; set; }

    /// <summary />
    public required bool Active { get; set; }

    /// <summary />
    public required IEnumerable<OrganizationUserRole> OrganizationUserRoles { get; set; }

    ///// <summary />
    //public required IEnumerable<Guid> SiteIds { get; set; }

    /// <summary />
    public required IEnumerable<Site>? Sites { get; set; }

    ///// <summary />
    //public required IEnumerable<Guid> WorkspaceIds { get; set; }

    /// <summary />
    public required IEnumerable<Workspace>? Workspaces { get; set; }
}
