namespace MDC.Core.Services.Security;

/// <summary>
/// Deterministic in-process workspace-membership map for local development.
/// Keyed on the API key <c>UserId</c> claim from <c>appsettings.json</c>.
/// </summary>
public sealed class MockWorkspaceMembershipResolver : IWorkspaceMembershipResolver
{
    private static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> Map
        = new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase)
        {
            ["manager-001"]    = new[] { "ws-alpha", "ws-beta" },
            ["technician-001"] = new[] { "ws-beta" },
            // admin-001 is GlobalAdministrator and bypasses this map.
        };

    /// <inheritdoc />
    public Task<IReadOnlyList<string>> GetWorkspaceIdsAsync(string userId, CancellationToken ct = default)
        => Task.FromResult(Map.TryGetValue(userId, out var ids) ? ids : Array.Empty<string>());
}
