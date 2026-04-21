using System.Text.Json.Nodes;

namespace MDC.Core.Services.Api;

/// <summary/>
public interface IWorkspaceService
{
    /// <summary/>
    Task<IEnumerable<Workspace>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary/>
    Task<WorkspaceDescriptor?> GetWorkspaceDescriptorAsync(Guid workspaceId, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Workspace?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    ///// <summary/>
    //Task<Workspace?> GetByAddressAsync(string siteName, int address, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<Workspace> CreateAsync(CreateWorkspaceParameters createWorkspaceParameters, CancellationToken cancellationToken = default);

    /// <summary/>
    Task UpdateAsync(Guid workspaceId, JsonNode delta, CancellationToken cancellationToken = default);

    /// <summary/>
    Task SetWorkspaceLockAsync(Guid workspaceId, bool locked, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<bool> GetWorkspaceLockAsync(Guid workspaceId, CancellationToken cancellationToken = default);

    /// <summary/>
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<VNCSession> InitializeVNCSessionAsync(Guid workspaceId, int virtualMachineIndex, CancellationToken cancellationToken = default);

    /// <summary/>
    Task<RunCommandResponse[]> RunCommandAsync(Guid workspaceId, RunCommandDescriptor runCommandDescriptor, CancellationToken cancellationToken = default);
}
