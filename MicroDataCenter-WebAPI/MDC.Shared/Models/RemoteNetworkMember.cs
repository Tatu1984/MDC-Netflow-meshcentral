namespace MDC.Shared.Models;

/// <summary />
public class RemoteNetworkMember
{
    /// <summary />
    public required string Id { get; set; }

    /// <summary />
    public string? Name { get; set; }

    /// <summary />
    public string? Description { get; set; }

    /// <summary />
    public string[]? IPAddresses { get; set; }

    /// <summary />
    public required bool Online { get; set; }

    /// <summary />
    public required bool Authorized { get; set; }

    /// <summary />
    public required DateTimeOffset Created { get; set; }

    /// <summary />
    public required DateTimeOffset? LastOnline { get; set; }

    /// <summary />
    public int? Latency { get; set; }

    /// <summary />
    public string? PhyiscalIPAddress { get; set; }

    /// <summary />
    public string? ClientVersion { get; set; }


}
