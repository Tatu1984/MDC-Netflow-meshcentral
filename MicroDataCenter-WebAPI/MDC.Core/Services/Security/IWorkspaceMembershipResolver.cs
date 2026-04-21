namespace MDC.Core.Services.Security;

/// <summary>Returns which workspaces a user belongs to.</summary>
public interface IWorkspaceMembershipResolver
{
    /// <summary>Return the workspace ids the given user is a member of.</summary>
    Task<IReadOnlyList<string>> GetWorkspaceIdsAsync(string userId, CancellationToken ct = default);
}
