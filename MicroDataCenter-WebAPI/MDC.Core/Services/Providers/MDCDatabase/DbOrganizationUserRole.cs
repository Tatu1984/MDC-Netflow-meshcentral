using Microsoft.EntityFrameworkCore;

namespace MDC.Core.Services.Providers.MDCDatabase;

[Index(nameof(IsDeleted))]
[Index(nameof(UserId))]
[Index(nameof(OrganizationId))]
internal class DbOrganizationUserRole
{
    public Guid Id { get; set; }

    public required string Role { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }

    public required Guid UserId { get; set; }

    public virtual DbUser? User { get; set; }

    public required Guid OrganizationId { get; set; }

    public required bool IsDeleted { get; set; }

    public virtual DbOrganization? Organization { get; set; }
}
