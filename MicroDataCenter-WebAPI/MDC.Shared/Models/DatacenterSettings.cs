namespace MDC.Shared.Models;

/// <summary/>
public class DatacenterSettings
{
    /// <summary>
    /// 
    /// </summary>
    public int MinWorkspaceAddress { get; set; } = 100;

    /// <summary>
    /// 
    /// </summary>
    public int MinVirtualNetworkTag { get; set; } = 10;

    /// <summary>
    /// 
    /// </summary>
    public string WanBridgeName { get; set; } = "vmbr02";

    /// <summary>
    /// 
    /// </summary>
    public int? WanBridgeTag { get; set; } = 2;

    /// <summary>
    /// 
    /// </summary>
    public string LanBridgeName { get; set; } = "vmbr02";   // Also use LAN as trunk

    /// <summary>
    /// 
    /// </summary>
    public string? PublicBridgeName { get; set; } = null;

    /// <summary>
    /// 
    /// </summary>
    public int? PublicBridgeTag { get; set; } = null;

    /// <summary>
    /// 
    /// </summary>
    public string DefaultGatewayTemplateName { get; set; } = "Alpine";

    /// <summary>
    /// 
    /// </summary>
    public int? DefaultGatewayTemplateRevision { get; set; } = null;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForTaskTimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForTaskPollingDelayMilliseconds { get; set; } = 1000;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForQemuStatusTimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForQemuStatusPollingDelayMilliseconds { get; set; } = 1000;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForQemuAgentTimeoutSeconds { get; set; } = 60;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForQemuAgentPollingDelayMilliseconds { get; set; } = 5000;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForQemuAgentIPAddressTimeoutSeconds { get; set; } = 60;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForQemuAgentIPAddressPollingDelayMilliseconds { get; set; } = 5000;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForQemuAgentExecTimeoutSeconds { get; set; } = 240;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForQemuAgentExecPollingDelayMilliseconds { get; set; } = 500;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForZeroTierMembershipRequestTimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// 
    /// </summary>
    public int WaitForZeroTierMembershipRequestPollingDelayMilliseconds { get; set; } = 1000;

    /// <summary>
    /// 
    /// </summary>
    public string DefaultPrimaryVirtualNetworkName { get; set; } = "vnet0";

    /// <summary>
    /// 
    /// </summary>
    public string DefaultRemoteNetworkAddressCIDR { get; set; } = "172.31.0.0/24";

    /// <summary>
    /// 
    /// </summary>
    public string DefaultRemoteNetworkIPRangeStart { get; set; } = "172.31.0.10";

    /// <summary>
    /// 
    /// </summary>
    public string DefaultRemoteNetworkIPRangeEnd { get; set; } = "172.31.0.100";
}
