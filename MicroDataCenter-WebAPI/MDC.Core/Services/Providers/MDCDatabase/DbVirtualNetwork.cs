namespace MDC.Core.Services.Providers.MDCDatabase;

internal class DbVirtualNetwork
{
    public Guid Id { get; set; }

    public required Guid WorkspaceId { get; set; }

    public virtual DbWorkspace? Workspace { get; set; }

    public required int Index { get; set; }

    public required string Name { get; set; }

    public required int Tag { get; set; }

    public required string? ZeroTierNetworkId { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }
}
