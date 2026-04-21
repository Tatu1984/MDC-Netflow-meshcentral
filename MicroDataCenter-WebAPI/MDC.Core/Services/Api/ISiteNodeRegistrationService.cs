using System.Text.Json.Nodes;

namespace MDC.Core.Services.Api;

/// <summary />
public interface ISiteNodeRegistrationService
{
    /// <summary />
    Task<IEnumerable<SiteNodeRegistration>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary />
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<string> RequestAutoInstallationAsync(JsonNode systemInformation, CancellationToken cancellationToken = default);

    /// <summary />
    Task<SiteNodeRegistration> NotifyAutoInstallationAsync(Guid machineId, JsonNode deviceInformation, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<string> GetFirstBootScriptAsync(Guid uuid, CancellationToken cancellationToken);

    /// <summary />
    Task<SiteNodeRegistration> CompleteFirstBootAsync(Guid uuid, JsonNode firstBootInformation, CancellationToken cancellationToken = default);

    /// <summary />
    Task<(Site, SiteNode)> ApproveAsync(Guid id, SiteNodeRegistrationApprovalDescriptor approveDescriptor, CancellationToken cancellationToken = default);

    /// <summary />
    bool ValidateApiKey(string apiKey);
}
