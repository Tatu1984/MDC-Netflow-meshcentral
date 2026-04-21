namespace MDC.Core.Services.Providers.MDCDatabase;

internal class DbSite
{
    public Guid Id { get; set; }

    public required string Name { get; set; } // The name of the pve cluster

    public required string Description { get; set; }

    public required string ApiTokenId { get; set; }

    public required string ApiSecret { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }

    public virtual ICollection<DbSiteNode> SiteNodes { get; set; } = new List<DbSiteNode>();

    public virtual ICollection<DbWorkspace> Workspaces { get; set; } = new List<DbWorkspace>();

    public virtual ICollection<DbOrganization> Organizations { get; set; } = new List<DbOrganization>();
}
