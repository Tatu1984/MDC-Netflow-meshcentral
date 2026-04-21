using System.ComponentModel.DataAnnotations.Schema;

namespace MDC.Shared.Models;

/// <summary />
public class Site
{
    /// <summary />
    public required Guid Id { get; set;  }

    /// <summary />
    public required string Name { get; set; }

    /// <summary />
    public string? Description { get; set; }

    /// <summary />
    public required string? ClusterName { get; set; }

    /// <summary />
    public VirtualMachineTemplate[]? GatewayTemplates { get; set; }

    /// <summary />
    public VirtualMachineTemplate[]? VirtualMachineTemplates { get; set; }

    /// <summary />
    public required IEnumerable<SiteNode> SiteNodes { get; set; }

    /// <summary />
    public required IEnumerable<Organization>? Organizations { get; set; }

    /// <summary />
    public required IEnumerable<Workspace>? Workspaces { get; set; }

    /// <summary />
    //[JsonIgnore]
    [NotMapped]
    public required string ApiTokenId { get; set; }

    /// <summary />
    //[JsonIgnore]
    [NotMapped]
    public required string ApiSecret { get; set; }
}
