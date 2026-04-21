using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary />
public class SiteNode
{
    /// <summary />
    //[JsonIgnore]
    [NotMapped]
    public required string MemberAddress { get; set; } // Must be ignored by JSON Serializer and OData EDM

    /// <summary />
    //[JsonIgnore]
    [NotMapped]
    public required int ApiPort { get; set; }

    /// <summary />
    //[JsonIgnore]
    [NotMapped]
    public required bool ApiValidateServerCertificate { get; set; }

    /// <summary />
    //[JsonIgnore]
    [NotMapped]
    public required string? DeviceInfo { get; set; }

    /// <summary />
    public required Guid Id { get; set; }

    /// <summary />
    public required string Name { get; set; }

    /// <summary />
    public string? SystemName { get; set; }

    /// <summary />
    public required Guid MachineId { get; set; }

    /// <summary />
    public required string? SerialNumber { get; set; }

    /// <summary />
    // True when the node is configured in the management system
    public required DateTime? Registered { get; set; }

    /// <summary />
    public required string? HostName { get; set; }

    /// <summary />
    public required SiteNodeCPUInfo? CPUInfo { get; set; }

    /// <summary />
    public required SiteNodeStorageInfo? Storage { get; set; }

    /// <summary />
    public required SiteNodeMemoryInfo? Memory { get; set; }

    /// <summary />
    [JsonPropertyName("cpu")]
    public required decimal? CPU { get; set; }

    /// <summary />
    public required bool? Online { get; set; }

    /// <summary />
    public bool? Authorized { get; set; }   // When setting from the client side, this indicates whether the node should be authorized or not.
}
