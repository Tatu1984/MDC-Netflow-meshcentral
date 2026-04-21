using System.Security.Claims;

namespace MDC.Core.Services.Security;

/// <summary>Resolves the access tier for the current caller.</summary>
public interface ITierResolver
{
    /// <summary>Resolve the caller's tier (Admin vs WorkspaceMember) and workspace memberships.</summary>
    Task<Tier> ResolveAsync(ClaimsPrincipal user, CancellationToken ct = default);
}
