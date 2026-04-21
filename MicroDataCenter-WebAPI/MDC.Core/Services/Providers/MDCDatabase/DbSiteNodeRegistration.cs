using Microsoft.EntityFrameworkCore;

namespace MDC.Core.Services.Providers.MDCDatabase;

[Index(nameof(MemberAddress), IsUnique = true)]
[Index(nameof(UUID), IsUnique = true)]
internal class DbSiteNodeRegistration
{
    public Guid Id { get; set; }  

    public required Guid UUID { get; set; }    // The UUID of the device, provided by dmidecode of the pve node during auto instllation

    public required string SerialNumber { get; set; }

    public required string SystemInfo { get; set; }

    public string? DeviceInfo { get; set; }

    public string? MemberAddress { get; set; }  // The ZeroTier Member Address of the node, provided by the node during auto installation. This is used to identify the node when it connects to the ZeroTier network.

    public required DateTime CreatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public Guid? SiteNodeId { get; set; }

    public virtual DbSiteNode? SiteNode { get; set; }

}
