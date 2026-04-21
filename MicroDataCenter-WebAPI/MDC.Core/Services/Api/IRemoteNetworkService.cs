using System.Text.Json.Nodes;

namespace MDC.Core.Services.Api;

/// <summary />
public interface IRemoteNetworkService
{
    /// <summary />
    Task<IEnumerable<RemoteNetwork>> GetAllAsync(CancellationToken cancellationToken = default);
    
    /// <summary />
    Task<RemoteNetwork> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary />
    Task<RemoteNetwork> UpdateAsync(Guid id, RemoteNetworkUpdate remoteNetworkUpdate, CancellationToken cancellationToken = default);
   
}
