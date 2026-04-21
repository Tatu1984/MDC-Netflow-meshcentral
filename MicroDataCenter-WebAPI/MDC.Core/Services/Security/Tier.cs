namespace MDC.Core.Services.Security;

/// <summary>Access tier for a request, derived from the caller's claims.</summary>
public enum TierKind
{
    /// <summary>Caller has GlobalAdministrator — no workspace filtering applied.</summary>
    Admin,
    /// <summary>Caller is a workspace member — responses must be filtered to <see cref="Tier.WorkspaceIds"/>.</summary>
    WorkspaceMember,
}

/// <summary>The resolved tier for the current request.</summary>
/// <param name="Kind">Which tier the caller is in.</param>
/// <param name="WorkspaceIds">Workspace identifiers the caller belongs to (ignored when <paramref name="Kind"/> is Admin).</param>
public sealed record Tier(TierKind Kind, IReadOnlyList<string> WorkspaceIds);
