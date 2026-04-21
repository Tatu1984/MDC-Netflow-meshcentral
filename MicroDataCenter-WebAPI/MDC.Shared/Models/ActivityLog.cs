using System.ComponentModel.DataAnnotations;

namespace MDC.Shared.Models;

/// <summary />
public class ActivityLog
{
    /// <summary />
    [Key]
    public required Guid Id { get; set; }

    /// <summary />
    public required string EntityName { get; set; }

    /// <summary />
    public required Guid? EntityId { get; set; }

    /// <summary />
    public required string Action { get; set; }

    /// <summary />
    public required string? ChangesJson { get; set; }

    /// <summary />
    public required Guid UserId { get; set; }

    /// <summary />
    public User? User { get; set; }

    /// <summary />
    public DateTime TimestampUtc { get; set; }
}
