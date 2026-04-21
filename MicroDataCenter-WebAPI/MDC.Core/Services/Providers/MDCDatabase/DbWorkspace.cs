using Microsoft.EntityFrameworkCore;
using System;

namespace MDC.Core.Services.Providers.MDCDatabase;

[Index(nameof(IsDeleted))]
[Index(nameof(SiteId))]
[Index(nameof(OrganizationId))]
internal class DbWorkspace
{
    public Guid Id { get; set; }

    public required Guid SiteId { get; set; }

    public DbSite Site { get; set; } = null!;

    public required Guid OrganizationId { get; set; }

    public DbOrganization Organization { get; set; } = null!;

    public required int Address { get; set; }

    public required string Name { get; set; }

    public required string? Description { get; set; }

    public required DateTime CreatedAt { get; set; } 

    public required DateTime UpdatedAt { get; set; }

    public required string? Status { get; set; }

    public required bool Locked { get; set; }

    public required bool IsDeleted { get; set; }

    public virtual ICollection<DbVirtualNetwork> VirtualNetworks { get; set; } = new List<DbVirtualNetwork>();
}
