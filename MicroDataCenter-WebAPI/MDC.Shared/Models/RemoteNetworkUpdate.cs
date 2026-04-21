namespace MDC.Shared.Models;

/// <summary />
public class RemoteNetworkUpdate
{
    /// <summary />
    public RemoteNetworkIPAssignmentPool[]? IPAssignmentPools { get; set; }

    /// <summary />
    public RemoteNetworkRoute[]? ManagedRoutes { get; set; }

    /// <summary />
    public RemoteNetworkMemberUpdate[]? Members { get; set; }
}
