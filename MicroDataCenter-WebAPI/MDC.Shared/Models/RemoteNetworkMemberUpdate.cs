namespace MDC.Shared.Models;

/// <summary />
public class RemoteNetworkMemberUpdate
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
    public bool? Authorized { get; set; }
}
