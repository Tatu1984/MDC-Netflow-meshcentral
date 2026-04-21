namespace MDC.Shared.Models;

/// <summary />
public class SiteUpdateDescriptor
{
    /// <summary />
    public string? Name { get; set; }

    /// <summary />
    public string? Description { get; set; }

    /// <summary />
    public Guid[]? AddOrganizationIds { get; set; }

    /// <summary />
    public Guid[]? RemoveOrganizationIds { get; set; }
}
