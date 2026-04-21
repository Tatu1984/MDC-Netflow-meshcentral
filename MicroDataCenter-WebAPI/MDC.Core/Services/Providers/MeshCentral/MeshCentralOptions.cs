namespace MDC.Core.Services.Providers.MeshCentral;

/// <summary>Options that configure the MeshCentral trust-broker client.</summary>
public class MeshCentralOptions
{
    /// <summary>Configuration section name (appsettings).</summary>
    public const string ConfigurationSectionName = "MeshCentral";

    /// <summary>Base URL of the MeshCentral server. Ignored when <see cref="UseMock"/> is true.</summary>
    public string? BaseUrl { get; set; }

    /// <summary>Service account username used for control-plane calls.</summary>
    public string? ServiceUser { get; set; }

    /// <summary>Service account secret. Resolved from the secret store in production.</summary>
    public string? ServiceKey { get; set; }

    /// <summary>When true, an in-process deterministic mock is used instead of a real MeshCentral server.</summary>
    public bool UseMock { get; set; } = true;

    /// <summary>TTL for a freshly minted login ticket, in seconds.</summary>
    public int LoginTicketTtlSeconds { get; set; } = 60;

    /// <summary>Interval at which <see cref="MeshAgentEnrollmentService"/> runs its reconcile pass.</summary>
    public int EnrollmentReconcileSeconds { get; set; } = 5;

    /// <summary>Prefix applied to Mesh device groups (per-workspace).</summary>
    public string EnrollmentGroupPrefix { get; set; } = "mdc-ws-";
}
