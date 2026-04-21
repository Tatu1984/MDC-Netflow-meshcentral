namespace MDC.Shared.Models;

/// <summary />
public class RemoteNetwork
{
    /// <summary />
    public required Guid? Id { get; set; }

    /// <summary>
    /// 16 digit ZeroTier Network Id.
    /// </summary>
    public required string? NetworkId { get; set; }

    /// <summary />
    public required Guid SiteId { get; set; }

    /// <summary />
    public required Guid WorkspaceId { get; set; }

    /// <summary />
    public required Guid VirtualNetworkId { get; set; }

    /// <summary />
    public required string? Name { get; set; }

    /// <summary />
    public required RemoteNetworkIPAssignmentPool[]? IPAssignmentPools { get; set; }

    /// <summary />
    public required RemoteNetworkMember[]? Members {  get; set; }

    /// <summary />
    public required RemoteNetworkRoute[]? ManagedRoutes { get; set; }
}
