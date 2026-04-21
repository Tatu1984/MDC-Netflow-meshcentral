namespace MDC.Core.Services.Providers.ProxmoxDatacenterManager;

/// <summary>Options that configure the Proxmox Datacenter Manager client.</summary>
public class PdmClientOptions
{
    /// <summary>Configuration section name (appsettings).</summary>
    public const string ConfigurationSectionName = "Pdm";

    /// <summary>Base URL of the PDM server. Ignored when <see cref="UseMock"/> is true.</summary>
    public string? BaseUrl { get; set; }

    /// <summary>PDM API token. Resolved from the secret store in production.</summary>
    public string? ApiToken { get; set; }

    /// <summary>If true, an in-process deterministic mock is used instead of a real PDM.</summary>
    public bool UseMock { get; set; } = true;

    /// <summary>Cache TTL for live metric values.</summary>
    public int MetricsCacheSeconds { get; set; } = 5;

    /// <summary>Cache TTL for inventory values (clusters / nodes / VMs).</summary>
    public int InventoryCacheSeconds { get; set; } = 60;

    /// <summary>Per-request timeout against PDM.</summary>
    public int RequestTimeoutSeconds { get; set; } = 10;
}
