namespace MDC.Core.Services.Providers.MeshCentral.Dto;

/// <summary>A short-lived MeshCentral login URL the browser can redeem once.</summary>
/// <param name="Url">The single-use URL to open in a new tab.</param>
/// <param name="Token">The opaque token encoded in the URL (exposed for auditing).</param>
/// <param name="ExpiresAtUtc">Time after which the ticket must not be redeemed.</param>
/// <param name="NodeId">The target MeshCentral node id.</param>
public sealed record MeshSessionTicket(
    string Url,
    string Token,
    DateTime ExpiresAtUtc,
    string NodeId);
