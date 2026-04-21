using Microsoft.EntityFrameworkCore;

namespace MDC.Core.Services.Providers.MDCDatabase;

[Index(nameof(UserId))]
internal class DbActivityLog
{
    public Guid Id { get; set; }

    public required string EntityName { get; set; }

    public required Guid? EntityId { get; set; }

    public required string Action { get; set; } 

    public required string? ChangesJson { get; set; }

    public required Guid UserId { get; set; }

    public DateTime TimestampUtc { get; set; }

    public virtual DbUser? User { get; set; }
}
