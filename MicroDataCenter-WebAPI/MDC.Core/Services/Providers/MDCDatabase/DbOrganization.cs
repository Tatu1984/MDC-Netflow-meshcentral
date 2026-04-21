using Microsoft.EntityFrameworkCore;

namespace MDC.Core.Services.Providers.MDCDatabase;

[Index(nameof(Active))]
internal class DbOrganization
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public required string Description { get; set; }

    public required bool Active { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }

    public virtual ICollection<DbOrganizationUserRole> OrganizationUserRoles { get; set; } = new List<DbOrganizationUserRole>();

    public virtual ICollection<DbSite> Sites { get; set; } = new List<DbSite>();

    public virtual ICollection<DbWorkspace> Workspaces { get; set; } = new List<DbWorkspace>();
}
