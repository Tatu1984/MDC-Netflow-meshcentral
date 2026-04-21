using Microsoft.EntityFrameworkCore;

namespace MDC.Core.Services.Providers.MDCDatabase;

[Index(nameof(MemberAddress), IsUnique = true)]
[Index(nameof(MachineId))]
internal class DbSiteNode
{
    public Guid Id { get; set; }

    public Guid MachineId { get; set; }

    public required string MemberAddress { get; set; }     // MemberAddress of the ZeroTier node running on pve host

    public required string? SerialNumber { get; set; }

    public required Guid SiteId { get; set; }

    public virtual DbSite? Site { get; set; }

    public required string Name { get; set; }   // Name of the pve node.  Will be the same as DbSite.Name for single-node pve clusters

    public required int ApiPort { get; set; }

    public required bool ApiValidateServerCertificate { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }

    public virtual ICollection<DbSiteNodeRegistration> SiteNodeRegistrations { get; set; } = new List<DbSiteNodeRegistration>();
}
