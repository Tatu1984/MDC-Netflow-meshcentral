namespace MDC.Core.Services.Api;

/// <summary />
public interface ISiteService
{
    /// <summary/>
    Task<IEnumerable<Site>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Site?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    ///// <summary/>
    //Task<(Site, SiteNode)> CreateAsync(SiteDescriptor siteDescriptor, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Site> UpdateAsync(Guid id, SiteUpdateDescriptor siteUpdateDescriptor, CancellationToken cancellationToken = default);

    /// <summary/>
    Task DeleteAsync(Guid siteId, Guid siteNodeId, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<DownloadableTemplate[]> GetDownloadableTemplatesAsync(Guid siteId, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<string> DownloadTemplateAsync(Guid siteId, DownloadTemplateDescriptor downloadTemplateDescriptor, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<string?> GetDownloadTemplateStatusAsync(Guid siteId, CancellationToken cancellationToken = default);
}
