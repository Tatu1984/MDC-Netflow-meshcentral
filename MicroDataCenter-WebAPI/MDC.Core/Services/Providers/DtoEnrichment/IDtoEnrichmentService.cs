using MDC.Core.Services.Providers.MDCDatabase;

namespace MDC.Core.Services.Providers.DtoEnrichment;

/// <summary />
public interface IDtoEnrichmentService
{
    /// <summary />
    Task EnrichAsync(IEnumerable<Workspace> workspaces, bool expand, CancellationToken cancellationToken);

    /// <summary />
    Task EnrichAsync(Workspace workspace, bool expand, CancellationToken cancellationToken);

    /// <summary />
    Task EnrichAsync(IEnumerable<Site> sites, bool expand, CancellationToken cancellationToken);

    /// <summary />
    Task EnrichAsync(Site site, bool expand, CancellationToken cancellationToken);

    /// <summary />
    Task EnrichAsync(Site site, SiteNode siteNode, bool expand, CancellationToken cancellationToken);

    /// <summary />
    Task EnrichAsync(WorkspaceDescriptor workspaceDescriptor, Workspace workspace, CancellationToken cancellationToken);

    /// <summary />
    Task EnrichAsync(IEnumerable<SiteNodeRegistration> siteNodeRegistrations, CancellationToken cancellationToken);

    /// <summary />
    Task EnrichAsync(IEnumerable<RemoteNetwork> remoteNetworks,CancellationToken cancellationToken);

    /// <summary />
    Task EnrichAsync(RemoteNetwork remoteNetwork, CancellationToken cancellationToken);
}
