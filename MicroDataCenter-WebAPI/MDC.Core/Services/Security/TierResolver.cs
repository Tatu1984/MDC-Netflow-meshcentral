using System.Security.Claims;
using MDC.Core.Services.Providers.Authentication;

namespace MDC.Core.Services.Security;

/// <summary>
/// Default <see cref="ITierResolver"/>: GlobalAdministrator role → Admin tier,
/// otherwise WorkspaceMember with membership looked up by user id.
/// </summary>
public sealed class TierResolver : ITierResolver
{
    private readonly IWorkspaceMembershipResolver _membership;

    /// <summary>Construct with a workspace-membership source.</summary>
    public TierResolver(IWorkspaceMembershipResolver membership)
    {
        _membership = membership;
    }

    /// <inheritdoc />
    public async Task<Tier> ResolveAsync(ClaimsPrincipal user, CancellationToken ct = default)
    {
        if (user.IsInRole(UserRoles.GlobalAdministrator))
        {
            return new Tier(TierKind.Admin, Array.Empty<string>());
        }

        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var ids = await _membership.GetWorkspaceIdsAsync(userId, ct);
        return new Tier(TierKind.WorkspaceMember, ids);
    }
}
