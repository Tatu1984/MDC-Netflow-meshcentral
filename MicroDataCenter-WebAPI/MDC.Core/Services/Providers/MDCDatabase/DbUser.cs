using Microsoft.EntityFrameworkCore;

namespace MDC.Core.Services.Providers.MDCDatabase;

[Index(nameof(Active))]
internal class DbUser
{
    public required Guid Id { get; set; }   // The ObjectId from Microsoft Entra

    public required string Name { get; set; }   // The Display Name from Microsoft Entra?  TBD; this value may be from the Claim when authenticating, in which case this name Property is just for vanity in the database record

    public required bool Active { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }

    public virtual ICollection<DbOrganizationUserRole> OrganizationUserRoles { get; set; } = new List<DbOrganizationUserRole>();

    public virtual ICollection<DbActivityLog> Activities { get; set; } = new List<DbActivityLog>();
}
