using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Providers.MDCEndpoint;

internal class MDCEndpointService(IZeroTierService zeroTierService, IOptions<MDCEndpointServiceOptions> options, ILogger<MDCEndpointService> logger, IPVEClientFactory pveClientFactory, IMDCDatabaseService databaseService) : IMDCEndpointService
{
    public async Task<MicroDataCenterEndpoint[]> GetMicroDataCenterEndpointsAsync(Guid siteId, CancellationToken cancellationToken = default)
    {
        var siteNodes = await databaseService.GetAllSitesNodes().Where(i => i.SiteId == siteId).ToListAsync(cancellationToken);
        var members = await zeroTierService.GetManagementNetworkMembersAsync(cancellationToken);
        return members
            .Where(i => i.NodeId != i.ControllerId && i.Online != null && i.Online.Value > 0 && i.Config.Authorized && (i.Config.IPAssignments ?? []).Length != 0)
            // .Where(i => i.NodeId != i.ControllerId && (i.Config.IPAssignments ?? []).Length != 0)
            .Join(siteNodes.Where(i => i.Site != null), member => member.NodeId, dbSiteNode => dbSiteNode.MemberAddress, (member, dbSiteNode) =>
            ComputeMicroDataCenterEndpoint(member, TokenPVEClientServiceOptions.Create(dbSiteNode.Site!.ApiTokenId, dbSiteNode.Site.ApiSecret, member.Config.IPAssignments!.First(), dbSiteNode.ApiPort, dbSiteNode.ApiValidateServerCertificate, proxyBaseUrl: options.Value.ProxyBaseUrl)))
            .ToArray();
    }

    public async Task<MicroDataCenterEndpoint[]> GetMicroDataCenterEndpointsAsync(DbSiteNode[] dbSiteNodes, CancellationToken cancellationToken = default)
    {
        var members = await zeroTierService.GetManagementNetworkMembersAsync(cancellationToken);
        return members
            .Where(i => i.NodeId != i.ControllerId && (i.Config.IPAssignments ?? []).Length != 0)
            .Join(dbSiteNodes.Where(i => i.Site != null), member => member.NodeId, dbSiteNode => dbSiteNode.MemberAddress, (member, dbSiteNode) =>
            ComputeMicroDataCenterEndpoint(member, TokenPVEClientServiceOptions.Create(dbSiteNode.Site!.ApiTokenId, dbSiteNode.Site.ApiSecret, member.Config.IPAssignments!.First(), dbSiteNode.ApiPort, dbSiteNode.ApiValidateServerCertificate, proxyBaseUrl: options.Value.ProxyBaseUrl)))
            .ToArray();
    }

    public async Task<MicroDataCenterEndpoint[]> GetMicroDataCenterEndpointsAsync(DbSite dbSite, CancellationToken cancellationToken = default)
    {
        var members = await zeroTierService.GetManagementNetworkMembersAsync(cancellationToken);
        return members
            .Where(i => i.NodeId != i.ControllerId && i.Online != null && i.Online.Value > 0 && i.Config.Authorized && (i.Config.IPAssignments ?? []).Length != 0)
            // .Where(i => i.NodeId != i.ControllerId && (i.Config.IPAssignments ?? []).Length != 0)
            .Join(dbSite.SiteNodes.Where(i => i.Site != null), member => member.NodeId, dbSiteNode => dbSiteNode.MemberAddress, (member, dbSiteNode) =>
            ComputeMicroDataCenterEndpoint(member, TokenPVEClientServiceOptions.Create(dbSiteNode.Site!.ApiTokenId, dbSiteNode.Site.ApiSecret, member.Config.IPAssignments!.First(), dbSiteNode.ApiPort, dbSiteNode.ApiValidateServerCertificate, proxyBaseUrl: options.Value.ProxyBaseUrl)))
            .ToArray();
    }

    public async Task<MicroDataCenterEndpoint> GetMicroDataCenterEndpointAsync(string memberAddress, string apiTokenId, string apiSecret, int apiPort, bool apiValidateServerCertificate, CancellationToken cancellationToken = default)
    {
        // If the member has not joined the network yet, we cannot proceed
        var member = await LookupZTMemberAsync(memberAddress, true, cancellationToken);

        // The member must have an IP address to proceed
        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0) throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' does not have any IP assignments.");

        var pveClientServiceOptions = TokenPVEClientServiceOptions.Create(apiTokenId, apiSecret, member.Config.IPAssignments[0], apiPort, apiValidateServerCertificate, proxyBaseUrl: options.Value.ProxyBaseUrl);

        return ComputeMicroDataCenterEndpoint(member, pveClientServiceOptions);
    }

    public MicroDataCenterEndpoint? CreateMicroDataCenterEndpoint(ZTMember[] members, Site site)
    {
        return members
            .Where(i => i.NodeId != i.ControllerId && i.Online != null && i.Online.Value > 0 && i.Config.Authorized && (i.Config.IPAssignments ?? []).Length != 0)
            // .Where(i => i.NodeId != i.ControllerId && (i.Config.IPAssignments ?? []).Length != 0)
            .Join(site.SiteNodes, member => member.NodeId, dbSiteNode => dbSiteNode.MemberAddress, (member, siteNode) =>
            ComputeMicroDataCenterEndpoint(member, TokenPVEClientServiceOptions.Create(site.ApiTokenId, site.ApiSecret, member.Config.IPAssignments!.First(), siteNode.ApiPort, siteNode.ApiValidateServerCertificate, proxyBaseUrl: options.Value.ProxyBaseUrl)))
            .FirstOrDefault();
    }

    public async Task<ZTMember> AuthorizeMicroDatacenterMemberAsync(string memberAddress, CancellationToken cancellationToken = default)
    {
        // If the member has not joined the network yet, we cannot proceed
        var member = await LookupZTMemberAsync(memberAddress, false, cancellationToken);

        // Ensure Member is authorized
        if (!member.Config.Authorized)
        {
            member = await zeroTierService.SetNetworkMemberAuthorizationAsync(options.Value.MgmtNetworkId, member.NodeId, true, cancellationToken);
        }

        // Ensure the member has auto assigned IP Address
        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0)
        {
            member = await zeroTierService.WaitForMemberIPAssignmentAsync(options.Value.MgmtNetworkId, member.NodeId, cancellationToken);
        }

        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0)
        {
            throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' does not have any IP assignments.");
        }
        return member;
    }

    public async Task<MicroDataCenterEndpoint> RegisterMicroDataCenterAsync(string memberAddress, string siteNodeName, string registrationUserName, string registrationPassword, int port = 8006, bool validateServerCertificate = true, int timeout = 30, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Registering new Site with Member Address '{memberAddress}' with Site Node Name '{siteNodeName}'", memberAddress, siteNodeName);

        var member = await AuthorizeMicroDatacenterMemberAsync(memberAddress, cancellationToken);

        // Ensure the member has auto assigned IP Address
        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0)
        {
            member = await zeroTierService.WaitForMemberIPAssignmentAsync(options.Value.MgmtNetworkId, member.NodeId, cancellationToken);
        }

        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0)
        {
            throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' does not have any IP assignments.");
        }

        var ipAddress = member.Config.IPAssignments[0];
        var (tokenId, secret) = await CreatePVEAPITokenAsync(registrationUserName, registrationPassword, ipAddress, port, validateServerCertificate, timeout, cancellationToken);

        // Now that the member has the correct IP address, verify connectivity to the PVEClient
        var pveClientServiceOptions = TokenPVEClientServiceOptions.Create(tokenId, secret, ipAddress, port, validateServerCertificate, timeout, proxyBaseUrl: options.Value.ProxyBaseUrl);

        // Set the member name if it is not set
        if (string.IsNullOrEmpty(member.Name))
        {
            // Update the member name to match the local node name
            member = await zeroTierService.SetNetworkMemberNameAsync(
                options.Value.MgmtNetworkId,
                member.NodeId,
                siteNodeName,
                cancellationToken);
        }

        return ComputeMicroDataCenterEndpoint(member, pveClientServiceOptions) ?? throw new InvalidOperationException("Failed to register valid MDC Endpoint");
    }

    public async Task<IPVEClientService> CreatePVEClientAsync(DbSiteNode dbSiteNode, int timeout, CancellationToken cancellationToken = default)
    {
        if (dbSiteNode.Site == null) throw new InvalidOperationException("Site not loaded for SiteNode record");

        // If the member has not joined the network yet, we cannot proceed
        var member = await LookupZTMemberAsync(dbSiteNode.MemberAddress, true, cancellationToken);

        // The member must have an IP address to proceed
        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0) throw new InvalidOperationException($"ZeroTier member with address '{dbSiteNode.MemberAddress}' does not have any IP assignments.");

        return pveClientFactory.Create(
                    ComputeMicroDataCenterEndpoint(
                        member,
                        TokenPVEClientServiceOptions
                            .Create(
                                dbSiteNode.Site!.ApiTokenId,
                                dbSiteNode.Site.ApiSecret,
                                member.Config.IPAssignments!.First(),
                                dbSiteNode.ApiPort,
                                dbSiteNode.ApiValidateServerCertificate,
                                proxyBaseUrl: options.Value.ProxyBaseUrl
                            )
                    ));
    }

    public async Task<IPVEClientService[]> CreatePVEClientsAsync(DbSite dbSite, int timeout, CancellationToken cancellationToken = default)
    {
        // Lookup members from specified addresses
        var members = await zeroTierService.GetManagementNetworkMembersAsync(cancellationToken);

        // Consinder only the members from the list of memberAddresses which are not a controller, online, authorized, and have an IP address
        return members
            .Where(i => i.NodeId != i.ControllerId && i.Online != null && i.Online.Value > 0 && i.Config.Authorized && (i.Config.IPAssignments ?? []).Length != 0)
            .Join(
                dbSite.SiteNodes, 
                member => member.NodeId, 
                dbSiteNode => dbSiteNode.MemberAddress, 
                (member, dbSiteNode) => pveClientFactory.Create(
                    ComputeMicroDataCenterEndpoint(
                        member, 
                        TokenPVEClientServiceOptions
                            .Create(
                                dbSiteNode.Site!.ApiTokenId, 
                                dbSiteNode.Site.ApiSecret, 
                                member.Config.IPAssignments!.First(), 
                                dbSiteNode.ApiPort, 
                                dbSiteNode.ApiValidateServerCertificate, 
                                proxyBaseUrl: options.Value.ProxyBaseUrl
                            )
                    )
                ))
            .ToArray();
    }

    public async Task<IPVEClientService> CreatePrivilegedPVEClient(string memberAddress, string username, string password, int port, bool validateServerCertificate, int? timeout, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Creating Privileged PVE Client for Site Member Address '{memberAddress}' using Proxy '{useProxy}'.", memberAddress, options.Value.ProxyBaseUrl != null);

        var member = await LookupZTMemberAsync(memberAddress, true, cancellationToken);

        // The member must have an IP address to proceed
        if (member.Config.IPAssignments == null || member.Config.IPAssignments.Length == 0) throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' does not have any IP assignments.");

        var pveClient = pveClientFactory.Create(member.Config.IPAssignments[0], port, validateServerCertificate, timeout, options.Value.ProxyBaseUrl);
        _ = await pveClient.AuthenticateWithAccessTicketAsync(username, password, cancellationToken);
        return pveClient;
    }

    public async Task ConfigureSiteAsync(DbSiteNode dbSiteNode, IPVEClientService priviligedPVEClient, ConfigureSiteParameters configureSiteParameters, CancellationToken cancellationToken)
    {
        // Setup Networks
        var networkConfiguration = configureSiteParameters.SkipNetworkConfiguration ? null : (await ConfigureNetworksAsync(priviligedPVEClient, null,  cancellationToken));

        // Setup Api Permissions
        await ConfigureApiRolePermissionsAsync(priviligedPVEClient, cancellationToken);

        // Setup Workspace Lock Permissions
        await ConfigureLockrolePermissionsAsync(priviligedPVEClient, cancellationToken);

        // Configure Metric Server

        // Configure PBS
        await ConfigureProxmoxBackupServerAsync(priviligedPVEClient, cancellationToken);

        // Restore VM Templates
        var backupStorageContents = await GetBackupStorageContentsAsync(priviligedPVEClient, [MDCConstants.DataGateway_Name, MDCConstants.WorkspaceGatewayTemplate_Name], cancellationToken);
        await RestoreFromBackupAsync(priviligedPVEClient, backupStorageContents, cancellationToken);

        // Configure Data Gateway VM using networkConfiguration - this must be done after Networks and PBS are configured, and the VM is restored from backup
        if (networkConfiguration != null)
        {
            var dataGatewayStorageContent = backupStorageContents.FirstOrDefault(i => i.Notes == MDCConstants.DataGateway_Name) ?? throw new InvalidOperationException("Unable to restore Data Gateway");
            await ConfigureDataGatewayAsync(priviligedPVEClient, dbSiteNode.Name, dataGatewayStorageContent, networkConfiguration, configureSiteParameters.DataEgressOnMgmtNetwork, cancellationToken);
        }

        // Download ISO Images(?)
    }

    public async Task<DownloadableTemplate[]> GetDownloadableTemplatesAsync(DbSite dbSite, CancellationToken cancellationToken = default)
    {
        var pveClients = await CreatePVEClientsAsync(dbSite, 30, cancellationToken);
        var pveClient = pveClients.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available to Site Id '{dbSite.Id}'.");

        if (!(options.Value.ProxmoxBackupServer != null && options.Value.ProxmoxBackupServer.UserName != null && options.Value.ProxmoxBackupServer.Password != null))
        {
            throw new InvalidOperationException("Proxmox Backup Server is not configured.");
        }

        var resources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var existingTemplates = resources
            .Where(i => i.Template == true)
            .Select(i =>
            {
                if (!MDCHelper.ParseMDCVirtualMachineName(i.Name, true, out var workspaceAddress, out var type, out var index, out var name))
                    return null;
                return new
                {
                    PVEResource = i,
                    WorkspaceAddress = workspaceAddress,
                    Type = type,
                    Index = index,
                    Name = name
                };
            })
            .Where(i => i != null)
            .Select(i => i!)
            .ToArray();

        var storageContents = await pveClient.GetStorageContentAsync("localhost", options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);

        var siteStorageContents = await Task.WhenAll(storageContents.Select(async item =>
        {
            if (item.Content != "backup" && item.SubType != "qemu")
                return null;

            var config = await pveClient.StorageExtractConfigAsync("localhost", item.VolumeId, cancellationToken);
            var node = new JsonObject();
            foreach (var entry in config.Split('\n').Where(i => !i.StartsWith("#")).Select(i => i.Split(':', 2, StringSplitOptions.TrimEntries)))
            {
                var key = entry.ElementAtOrDefault(0);
                if (key == null) continue;
                node[key.Trim()] = entry.ElementAtOrDefault(1)?.Trim();
            }
            var qemuConfig = node.Deserialize<PVEQemuConfig>(JsonSerializerOptions.Web);
            if (qemuConfig == null) return null;


            if (!qemuConfig.UnknownProperties.TryGetValue("template", out var templateElement) || templateElement.GetString() != "1") return null;
            if (qemuConfig.Name == null) return null;
            if (!MDCHelper.ParseMDCVirtualMachineName(qemuConfig.Name, true, out var workspaceAddress, out var type, out var index, out var name) || name == null || index == null || type == null) return null;

            using var md5 = MD5.Create();

            return new DownloadableTemplate
            {
                Name = name,
                Revision = index.Value,
                Cores = qemuConfig.Cores,
                Memory = qemuConfig.Memory,
                Storage = (qemuConfig.ParseStorage() ?? []).Select(i => new VirtualMachineStorage
                {
                    ControllerType = i.ControllerType,
                    ControllerIndex = i.ControllerIndex,
                    Size = i.GetSize()
                }).ToArray(),
                Type = type,
                Size = item.Size,
                Downloaded = existingTemplates.Any(t => t.Name == name && t.Index == index.Value && t.Type == type),
                Digest = BitConverter.ToString(md5.ComputeHash(Encoding.UTF8.GetBytes(item.VolumeId)))
            };
        }));

        return siteStorageContents.Where(i => i != null).Select(i => i!).ToArray();
    }

    public async Task<string?> GetDownloadTemplateStatusAsync(DbSite dbSite, CancellationToken cancellationToken = default)
    {
        var pveClients = await CreatePVEClientsAsync(dbSite, 30, cancellationToken);
        var pveClient = pveClients.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available to Site Id '{dbSite.Id}'.");

        if (!(options.Value.ProxmoxBackupServer != null && options.Value.ProxmoxBackupServer.UserName != null && options.Value.ProxmoxBackupServer.Password != null))
        {
            throw new InvalidOperationException("Proxmox Backup Server is not configured.");
        }

        // First check if there is an existing qmrestore task running. Only one restore can happen at a time
        var qmRestoreTask = await GetQMRestoreTask(pveClient, cancellationToken);
        if (qmRestoreTask == null)
            return null;

        return qmRestoreTask.Status ?? qmRestoreTask.UPID;
    }

    public async Task<string> DownloadTemplateAsync(DbSite dbSite, DownloadTemplateDescriptor downloadTemplateDescriptor, CancellationToken cancellationToken = default)
    {
        var pveClients = await CreatePVEClientsAsync(dbSite, 30, cancellationToken);
        var pveClient = pveClients.FirstOrDefault() ?? throw new InvalidOperationException($"No endpoints available to Site Id '{dbSite.Id}'.");

        if (!(options.Value.ProxmoxBackupServer != null && options.Value.ProxmoxBackupServer.UserName != null && options.Value.ProxmoxBackupServer.Password != null))
        {
            throw new InvalidOperationException("Proxmox Backup Server is not configured.");
        }

        // First check if there is an existing qmrestore task running. Only one restore can happen at a time
        var qmRestoreTask = await GetQMRestoreTask(pveClient, cancellationToken);
        if (qmRestoreTask != null) throw new InvalidOperationException("Cannot download template while another download is in progress");
        
        var storageContents = await pveClient.GetStorageContentAsync("localhost", options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);

        // Find the archive matching the downloadTemplateDescriptor
        using var md5 = MD5.Create();
        var target = storageContents
            .FirstOrDefault(item => item.Content == "backup" && item.SubType == "qemu" && downloadTemplateDescriptor.Digest == BitConverter.ToString(md5.ComputeHash(Encoding.UTF8.GetBytes(item.VolumeId))));

        if (target == null) throw new InvalidOperationException("Not Found");

        var vmid = target.VMID ?? throw new InvalidOperationException("Unable to determine VMID");

        var resources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var existingVMIDs = resources.Where(i => i.VmId != null && i.VmId > vmid).Select(i => i.VmId!.Value).Order().ToArray();
        var newId = Enumerable.Range(existingVMIDs.FirstOrDefault(vmid), existingVMIDs.Length + 1).Except(existingVMIDs).FirstOrDefault();

        var storages = resources.Where(i => i.Type == PVEResourceType.Storage).ToArray();
        var imageStorage = storages.FirstOrDefault(i => (i.Content ?? string.Empty).Split(',').Contains("images")) ?? throw new InvalidOperationException($"Unable to determine storage capacity for Datacenter");

        var upid = await pveClient.CreateQemuAsync("localhost", newId, true, imageStorage.Id.Split('/').Last(), target.VolumeId, cancellationToken);
        return upid;
    }

    private async Task<PVETask?> GetQMRestoreTask(IPVEClientService pveClient, CancellationToken cancellationToken = default)
    {
        var tasks = await pveClient.GetTasksAsync(cancellationToken);
        return tasks.FirstOrDefault(i => i.Type == "qmrestore" && i.EndTime == null);
    }

    public async Task<bool> CanLockWorkspaces(IPVEClientService pveClient, CancellationToken cancellationToken = default)
    {
        // Check that the pveClient has permissions to manage workspace locks
        var permissions = await pveClient.GetAccessPermissionsAsync(cancellationToken);
        return true;
        // return (permissions["/vms"]?["Permission.Modify"]?.GetValue<int>() == 1);
    }

    public async Task RemoveMicroDatacenterEndpointAsync(string memberAddress, CancellationToken cancellationToken = default)
    {
        await zeroTierService.DeleteNetworkMemberAsync(options.Value.MgmtNetworkId, memberAddress, cancellationToken);
    }

    #region Private

    private async Task<ZTMember> LookupZTMemberAsync(string memberAddress, bool authorizationRequired, CancellationToken cancellationToken = default)
    {
        // If the member has not joined the network yet, we cannot proceed
        var member = await zeroTierService.GetNetworkMemberByIdAsync(options.Value.MgmtNetworkId, memberAddress, false, null, cancellationToken) ?? throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' does not exist in the MDC Management Network.");

        // The member must be online to proceed
        if (member.Online == null || member.Online.Value == 0) throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' is not online. It must be online to create a PVE Client.");

        // The member must be authorized to proceed
        if (authorizationRequired && !member.Config.Authorized) throw new InvalidOperationException($"ZeroTier member with address '{memberAddress}' is not authorized. It must be authorized to create a PVE Client.");

        return member;
    }

    private async Task<(string tokenId, string secret)> CreatePVEAPITokenAsync(string username, string password, string ipAddress, int port, bool validateServerCertificate, int? timeout, CancellationToken cancellationToken = default)
    {
        var apiUserId = "MDCApiUser@pve";
        var apiTokenId = "MDCApiToken";

        // Create a PVEClient to authenticate and create the API token
        var privilegedPVEClient = pveClientFactory.Create(ipAddress, port, validateServerCertificate, timeout, options.Value.ProxyBaseUrl);
        _ = await privilegedPVEClient.AuthenticateWithAccessTicketAsync(username, password, cancellationToken);

        await ConfigureApiRolePermissionsAsync(privilegedPVEClient, cancellationToken);

        // Ensure user and user api token are created
        {
            var users = await privilegedPVEClient.GetUsersAsync(cancellationToken);
            var user = users.FirstOrDefault(u => u?["userid"]?.GetValue<string>() == apiUserId);
            if (user == null)
            {
                var success = await privilegedPVEClient.CreateUserAsync(apiUserId, GeneratePassword(10), new string[] { MDCConstants.PVE_ApiGroupId }, "Created by MDC Registration", cancellationToken);
            }
            user = await privilegedPVEClient.GetUserAsync(apiUserId, cancellationToken);

            // Ensure that the user is a member of the group
            var groups = user["groups"]?.AsArray()?.Select(i => i?.GetValue<string>()).ToArray() ?? [];
            if (!groups.Contains(MDCConstants.PVE_ApiGroupId))
            {
                var success = await privilegedPVEClient.UpdateUserAsync(apiUserId, new string[] { MDCConstants.PVE_ApiGroupId }, null, cancellationToken);
            }

            // Always generate a new API Token
            var apiTokens = await privilegedPVEClient.GetUserAPITokensAsync(apiUserId, cancellationToken);
            var existing = apiTokens.Select(i => i?["tokenId"]?.GetValue<string>()).ToHashSet();
            string targetId = apiTokenId;
            for (int x = 0;x<100; x++)
            {
                targetId = $"{apiTokenId}{x:D03}";
                if (!existing.Contains(targetId)) break;
            }
            var apiTokenResponse = await privilegedPVEClient.CreateUserAPITokenAsync(apiUserId, targetId, "Created By MDC Registration", false, cancellationToken);
            var fullTokenId = apiTokenResponse?["full-tokenid"]?.GetValue<string>() ?? throw new InvalidOperationException("Unable to retrieve API token id");
            var value = apiTokenResponse?["value"]?.GetValue<string>() ?? throw new InvalidOperationException("Unable to retrieve API secret");

            return (fullTokenId, value);
        }
    }

    private class NetworkConfiguration
    {
        public required PVENodeNetwork[] MgmtNics { get; set; }
        public PVENodeNetwork[]? DataNics { get; set; }
        public PVENodeNetwork[]? TrunkNics { get; set; }
        public PVENodeNetwork[]? ClusterNics { get; set; }

        public required PVENodeNetwork MgmtBridge { get; set; }
        public required PVENodeNetwork DataBridge { get; set; }
        public required PVENodeNetwork TrunkBridge { get; set; }
    }

    private async Task<NetworkConfiguration> ConfigureNetworksAsync(IPVEClientService priviligedPVEClient, string? overrideDataBridgeNetworkInterfaceName, CancellationToken cancellationToken = default)
    {
        // ** BUGBUG: SECURITY WARNING **
        // When dataEgressOnMgmtNetwork==TRUE, the DATA Gateway VM will share the MGMT network interface.  This does not separate MGMT and DATA network and exposes the host MGMT network to guests.

        // When overrideDataBridgeNetworkInterfaceName is specified, Bridge vmbr01 will be assigned to this Network Interface if it exists (and is not being used by MGMT or CLUSTER; otherwise an exception is thrown)
        // Whe both dataEgressOnMgmtNetwork==TRUE and overrideDataBridgeNetworkInterfaceName has a value, vmbr01 will be assigned to the overrideDataBridgeNetworkInterfaceName but the DATA Gateway VM will use vmbr0;  as a result vmbr01 exists but is not used.

        string node = "localhost";
        DatacenterSettings datacenterSettings = new DatacenterSettings();
        var (_nodeNetworks, changes) = await priviligedPVEClient.GetNodeNetworkAsync(node, cancellationToken);

        // Determine which networks should be MGMT, DATA, TRUNK, and CLUSTER
        
        // MGMT network has:
        //  - a required entry where NetworkInterfaceName == "vmbr0" and NetworkInterfaceType == "bridge".  This entry must have a value for address, gateway and bridge_ports. 
        //  - each of the values in (vmbr0, bridge) bridge_ports property are the MGMT network physical nics.  Each of these have NetworkInterfaceName == <bridge port item> and NetworkInterfaceType == "eth"
        //  - NOTE: it is assumed that vmbr0 has CIDR, Address and Gateway property values
        var mgmtNetworkBridge_vmbr0 = _nodeNetworks.FirstOrDefault(i => i.NetworkInterfaceName == "vmbr0" && i.NetworkInterfaceType == "bridge") ?? throw new InvalidOperationException($"Node does not have MGMT network. Bridge network named 'vmbr0' is required.");
        {
            mgmtNetworkBridge_vmbr0.Comments = "MGMT";

            // Ensure vmbr0 option has "metric 15"
            /*  NOTE: This is not supported by the API.  /etc/network/interfaces file must be edited
            mgmtNetworkBridge_vmbr0.Options ??= [];
            var options = mgmtNetworkBridge_vmbr0.Options.Where(i => !i.StartsWith("metric", StringComparison.OrdinalIgnoreCase)).ToList();
            options.Add("metric 15");
            mgmtNetworkBridge_vmbr0.Options = options.ToArray();
            */
        }

        // mvlan0 is an interface on vmbr0 having a dynamic IP and ensures that the MGMT network can reach internet when the static IP which the device was provisioned on does not have a gateway on the network the node could be later connected to
        /*  NOTE: This is not supported by the API.  /etc/network/interfaces file must be edited
        PVENodeNetwork nodeNetwork_mvlan0 = _nodeNetworks.FirstOrDefault(i => i.NetworkInterfaceName == "mvlan0") ?? new PVENodeNetwork
        {
            NetworkInterfaceName = "mvlan0",
            NetworkInterfaceType = "unknown"
        };
        {
            nodeNetwork_mvlan0.Comments = "MGMT";
            nodeNetwork_mvlan0.Method = "dhcp";
            nodeNetwork_mvlan0.Method6 = null;
            // Ensure mvlan0 option has options
            nodeNetwork_mvlan0.Options ??= [];
            var options = nodeNetwork_mvlan0.Options.Where(i => !(
                i.StartsWith("metric", StringComparison.OrdinalIgnoreCase)
                || i.StartsWith("pre-up", StringComparison.OrdinalIgnoreCase)
                || i.StartsWith("post-down", StringComparison.OrdinalIgnoreCase)
                )).ToList();
            options.Add("pre-up ip link add link vmbr0 name mvlan0 type macvlan mode bridge");
            options.Add("post-down ip link del mvlan0");
            options.Add("metric 10");
            nodeNetwork_mvlan0.Options = options.ToArray();
        }
        */

        var _mgmtNetworkBridgePorts = (mgmtNetworkBridge_vmbr0.BridgePorts ?? string.Empty).Split(' ');
        if (_mgmtNetworkBridgePorts.Length == 0) throw new InvalidOperationException("MGMT network bridge 'vmbr0' does not have any bridge ports defined. This is required.");
        var mgmtNetworkInterfaces = _nodeNetworks.Where(i => _mgmtNetworkBridgePorts.Contains(i.NetworkInterfaceName)).ToArray(); // Note: it is assumed that these also have NetworkInterfaceType == "eth" because Proxmox will not allow BridgePort entry to be a node network where type is not eth (this is an assumption)
        // Check that all of the bridge ports refernced in vmbr0 exist
        if (mgmtNetworkInterfaces.Length != _mgmtNetworkBridgePorts.Length) throw new InvalidOperationException($"MGMT network bridge 'vmbr0' has bridge ports defined which do not exist: {string.Join(',', _mgmtNetworkBridgePorts.Except(mgmtNetworkInterfaces.Select(i => i.NetworkInterfaceName)))}");
        
        // Of the remaining nodeNetworks:
        // - (optional) CLUSTER network has a single entry where NetworkInterfaceType == eth and CIDR has a value.  At this time a cluster must be created manually, which would result in this scenario being true
        var clusterNetworkInterfaces = _nodeNetworks.Except(mgmtNetworkInterfaces).Where(i => i.NetworkInterfaceType == "eth" && i.CIDR != null).ToArray();

        // The rest of the networks where NetworkInterfacType == eth must be either DATA or TRUNK based on the number of dataOrTrunkNetworkInterfaces entries
        var _dataOrTrunkNetworkInterfaces = _nodeNetworks
            .Except(mgmtNetworkInterfaces.Concat(clusterNetworkInterfaces))
            .Where(i => i.NetworkInterfaceType == "eth" && i.Exists == 1 && !(i.AltNames ?? []).Any(j => j.StartsWith("wl")))
            .ToArray();

        // These are the possible scenarios for DATA and TRUNK network interfaces:
        PVENodeNetwork? dataNetworkInterface = null;
        PVENodeNetwork[]? trunkNetworkInterfaces = null;

        // Bridge vmbr01 is always DATA egress and is the WAN for Data Gateway
        PVENodeNetwork nodeNetwork_vmbr01 = _nodeNetworks.FirstOrDefault(i => i.NetworkInterfaceName == "vmbr01") ?? new PVENodeNetwork
        {
            NetworkInterfaceName = "vmbr01",
            NetworkInterfaceType = "bridge"
        };
        nodeNetwork_vmbr01.Autostart = 1;
        nodeNetwork_vmbr01.Comments = "DATA";
        // Bridge vmbr02 is always TRUNK. VLAN2 is also the LAN for the Data Gateway
        PVENodeNetwork nodeNetwork_vmbr02 = _nodeNetworks.FirstOrDefault(i => i.NetworkInterfaceName == "vmbr02") ?? new PVENodeNetwork
        {
            NetworkInterfaceName = "vmbr02",
            NetworkInterfaceType = "bridge"
        };
        nodeNetwork_vmbr02.Autostart = 1;
        nodeNetwork_vmbr02.BridgeVLANAware = 1;
        nodeNetwork_vmbr02.Comments = "TRUNK";
        // Map bridges vmbr01 and vmbr02 to physical NICs
        switch (_dataOrTrunkNetworkInterfaces.Length)
        {
            // When 0, there are no physical network interfaces available to isolate DATA and TRUNK network segments. As a result mgmtNetworkInterfaces must be shared for DATA and TRUNK
            // * Bridge vmbr01 will use VLAN 2 of the MGMT NIC
            // * Bridge vmbr02 will use VLAN 3 of the MGMT NIC - ***BUGBUG: Does this really work and tag packets on the MGMT NIC for TRUNK?
            // * Bridge vmbr0 must have VlanAware==1
            case 0:
                {
                    foreach (var i in mgmtNetworkInterfaces)
                    {
                        i.Comments = "MGMT,[2]DATA,[3]TRUNK";
                    }
                    mgmtNetworkBridge_vmbr0.BridgeVLANAware = 1;
                    
                    nodeNetwork_vmbr01.BridgePorts = string.Join(' ', _mgmtNetworkBridgePorts.Select(i => $"{i}.2"));
                    nodeNetwork_vmbr02.BridgePorts = string.Join(' ', _mgmtNetworkBridgePorts.Select(i => $"{i}.3"));
                    break;
                }
            // When 1, the dataOrTrunk physical network interface is used for both DATA and TRUNK network segments. As a result:
            // * Bridge vmbr01 will use VLAN 2 of the MGMT NIC
            // * Bridge vmbr02 will use the physical interface
            //
            // - When dataEgressOnMgmtNetwork == FALSE:
            //      * DATA gateway VM's WAN must be assigned to vmbr02 (with DatacenterSettings.WanBridgeTag = null, even though vmbr02 is a trunk / carries VLAN traffic)
            //      * Physical network interface for dataOrTrunkNetworkInterfaces is expected to be connected to a router with internet access.
            //  - When dataEgressOnMgmtNetwork==TRUE:
            //      * DATA Gateway VM's WAN must be assigned to vmbr0
            //      => ** BUGBUG: SECURITY WARNING ** this does not separate MGMT and DATA network segments and exposes the host MGMT network to guests.
            case 1:
                {
                    foreach (var i in mgmtNetworkInterfaces)
                    {
                        i.Comments = "MGMT,[2]DATA";
                    }
                    nodeNetwork_vmbr01.BridgePorts = string.Join(' ', _mgmtNetworkBridgePorts.Select(i => $"{i}.2"));

                    trunkNetworkInterfaces = _dataOrTrunkNetworkInterfaces;
                    foreach (var trunkNetworkInterface in trunkNetworkInterfaces)
                    {
                        trunkNetworkInterface.Comments = "TRUNK";
                    }
                    nodeNetwork_vmbr02.BridgePorts = string.Join(' ', trunkNetworkInterfaces.Select(i => i.NetworkInterfaceName));
                    break;
                }
            // When 2 or higher the physical network interfaces for DATA and TRUNK network segments can be isolated.
            // - When overrideDataBridgeNetworkInterfaceName is null
            //      * DATA bridge (vmbr01) BridgePorts value will be the dataOrTrunkNetworkInterfaces entry with the lowest priority
            // - When overrideDataBridgeNetworkInterfaceName is not null
            //      * DATA bridge (vmbr01) BridgePorts value will be the dataOrTrunkNetworkInterfaces entry with the matching Network Interface Name or altname
            // * The TRUNK bridge (vmbr02) BridgePorts value will be the remaining dataOrTrunkNetworkInterfaces
            //
            // - When dataEgressOnMgmtNetwork == FALSE:
            //      * DATA gateway VM's WAN must be assigned to vmbr01
            //      * Physical network interface for DATA bridge (vmbr01) is expected to be connected to a router with internet access.
            //  - When dataEgressOnMgmtNetwork==TRUE:
            //      * DATA gateway VM's WAN must be assigned to vmbr0
            //      => ** BUGBUG: SECURITY WARNING ** this does not separate MGMT and DATA network segments and exposes the host MGMT network to guests.
            default:
                {
                    foreach (var i in mgmtNetworkInterfaces)
                    {
                        i.Comments = "MGMT";
                    }

                    dataNetworkInterface = _dataOrTrunkNetworkInterfaces.FirstOrDefault(i => i.Comments != null && i.Comments.StartsWith("DATA")) ??
                        _dataOrTrunkNetworkInterfaces
                        .OrderBy(i => i.Priority ?? 0)
                        .First(i => (i.Comments != null && i.Comments.StartsWith("DATA")) || overrideDataBridgeNetworkInterfaceName == null || i.NetworkInterfaceName == overrideDataBridgeNetworkInterfaceName || (i.AltNames ?? []).Contains(overrideDataBridgeNetworkInterfaceName));
                    dataNetworkInterface.Comments = "DATA";

                    trunkNetworkInterfaces = _dataOrTrunkNetworkInterfaces.Except([dataNetworkInterface]).ToArray();
                    foreach (var trunkNetworkInterface in trunkNetworkInterfaces)
                    {
                        trunkNetworkInterface.Comments = "TRUNK";
                    }

                    nodeNetwork_vmbr01.BridgePorts = dataNetworkInterface.NetworkInterfaceName;
                    nodeNetwork_vmbr02.BridgePorts = string.Join(' ', trunkNetworkInterfaces.Select(i => i.NetworkInterfaceName).Order());
                    break;
                }
        }

        // Update phyiscal interfaces
        {
            foreach (var mgmtNetworkInterface in mgmtNetworkInterfaces)
            {
                var mgmtNetworkInterfaces_response = await priviligedPVEClient.UpdateNodeNetworkAsync(node, mgmtNetworkInterface, cancellationToken);
            }
            if (trunkNetworkInterfaces != null)
            {
                foreach (var trunkNetworkInterface in trunkNetworkInterfaces)
                {
                    var trunkNetworkInterface_response = await priviligedPVEClient.UpdateNodeNetworkAsync(node, trunkNetworkInterface, cancellationToken);
                }
            }
            if (dataNetworkInterface != null)
            {
                var dataNetworkInterface_response = await priviligedPVEClient.UpdateNodeNetworkAsync(node, dataNetworkInterface, cancellationToken);
            }
            if (clusterNetworkInterfaces != null)
            {
                foreach (var clusterNetworkInterface in clusterNetworkInterfaces)
                {
                    var clusterNetworkInterface_response = await priviligedPVEClient.UpdateNodeNetworkAsync(node, clusterNetworkInterface, cancellationToken);
                }
            }
        }

        // Update bridges
        {
            var mgmtNetworkBridge_response = await priviligedPVEClient.UpdateNodeNetworkAsync(node, mgmtNetworkBridge_vmbr0, cancellationToken);
            if (nodeNetwork_vmbr01.Priority == null)
            {
                var nodeNetwork_vmbr01_response = await priviligedPVEClient.CreateNodeNetworkAsync(node, nodeNetwork_vmbr01, cancellationToken);
            }
            else
            {
                var nodeNetwork_vmbr01_response = await priviligedPVEClient.UpdateNodeNetworkAsync(node, nodeNetwork_vmbr01, cancellationToken);
            }
            if (nodeNetwork_vmbr02.Priority == null)
            {
                var nodeNetwork_vmbr02_response = await priviligedPVEClient.CreateNodeNetworkAsync(node, nodeNetwork_vmbr02, cancellationToken);
            }
            else
            {
                var nodeNetwork_vmbr02_response = await priviligedPVEClient.UpdateNodeNetworkAsync(node, nodeNetwork_vmbr02, cancellationToken);
            }
            // mvlan0 ensures that the host has a dynamic IP to access the when the static IP of the host does not match the dynamically assigned network the node is connected to
            /*  NOTE: This is not supported by the API.  /etc/network/interfaces file must be edited
            if (nodeNetwork_mvlan0.Priority == null)
            {
                var nnodeNetwork_mvlan0_response = await priviligedPVEClient.CreateNodeNetworkAsync(node, nodeNetwork_mvlan0, cancellationToken);
            }
            else
            {
                var nnodeNetwork_mvlan0_response = await priviligedPVEClient.UpdateNodeNetworkAsync(node, nodeNetwork_mvlan0, cancellationToken);
            }
            */
        }

        // Check for changes before applying changes
        var (nodeNetworks, networkChanges) = await priviligedPVEClient.GetNodeNetworkAsync(node, cancellationToken);
        if (!string.IsNullOrEmpty(networkChanges))
        {
            await priviligedPVEClient.ApplyNodeNetworkChangesAsync(node, cancellationToken);
        }

        return new NetworkConfiguration
        {
            MgmtBridge = mgmtNetworkBridge_vmbr0,
            MgmtNics = mgmtNetworkInterfaces,
            DataBridge = nodeNetwork_vmbr01,
            DataNics = dataNetworkInterface != null ? new PVENodeNetwork[] { dataNetworkInterface } : null,
            TrunkBridge = nodeNetwork_vmbr02 ,   
            TrunkNics = trunkNetworkInterfaces,
            ClusterNics = clusterNetworkInterfaces
        };
    }

    private async Task ConfigureApiRolePermissionsAsync(IPVEClientService privilegedPVEClient, CancellationToken cancellationToken = default)
    {
        // Ensure permissions are setup
        var apiRoleprivileges = new string[]
        {
            "Sys.Audit",
            "VM.Allocate",
            "VM.Audit",
            "VM.Clone",
            "VM.Config.Network",
            "VM.Config.CPU",
            "VM.Config.Memory",
            "VM.GuestAgent.Unrestricted",
            "VM.PowerMgmt",
            "VM.Backup",
            "Datastore.Audit",
            "Datastore.AllocateSpace",
            "SDN.Use",
            "Permissions.Modify",
            "VM.Console",
            "VM.Config.Options," +
            "VM.Config.CDROM"
        };
        var apiACLPath = "/";

        // Ensure the role is created and has expected permissions
        {
            var roles = await privilegedPVEClient.GetRolesAsync(cancellationToken);
            var role = roles.FirstOrDefault(r => r?["roleId"]?.GetValue<string>() == MDCConstants.PVE_ApiRoleId);
            if (role == null)
            {
                logger.LogInformation("Create Role {roleid} with Privileges {apiRolePrivileges}", MDCConstants.PVE_ApiRoleId, apiRoleprivileges);
                var success = await privilegedPVEClient.CreateRoleAsync(MDCConstants.PVE_ApiRoleId, apiRoleprivileges, cancellationToken);
                roles = await privilegedPVEClient.GetRolesAsync(cancellationToken);
                role = roles.FirstOrDefault(r => r?["roleId"]?.GetValue<string>() == MDCConstants.PVE_ApiRoleId);
            }

            var rolePrivileges = role?["privs"]?.GetValue<string>().Split(',') ?? throw new InvalidOperationException("Unable to retrieve privileges for role.");
            if (!rolePrivileges.Order().SequenceEqual(apiRoleprivileges.Order()))
            {
                logger.LogInformation("Update Role {roleid} with Privileges {apiRolePrivileges}", MDCConstants.PVE_ApiRoleId, apiRoleprivileges);
                var success = await privilegedPVEClient.UpdateRoleAsync(MDCConstants.PVE_ApiRoleId, apiRoleprivileges, cancellationToken);
            }
        }

        // Ensure the group is created
        {
            var groups = await privilegedPVEClient.GetGroupsAsync(cancellationToken);
            var group = groups.FirstOrDefault(g => g?["groupid"]?.GetValue<string>() == MDCConstants.PVE_ApiGroupId);
            if (group == null)
            {
                logger.LogInformation("Create Group {groupId}", MDCConstants.PVE_ApiGroupId);
                var success = await privilegedPVEClient.CreateGroupAsync(MDCConstants.PVE_ApiGroupId, MDCConstants.PVE_ApiGroupId, cancellationToken);
            }
        }

        // Ensure access list entry is created
        {
            var acl = await privilegedPVEClient.GetAccessControlListAsync(cancellationToken);
            var aclEntry = acl.FirstOrDefault(entry => entry.Path == apiACLPath && entry.Type == "group" && entry.UserGroupId == MDCConstants.PVE_ApiGroupId && entry.RoleId == MDCConstants.PVE_ApiRoleId);
            if (aclEntry == null)
            {
                logger.LogInformation("Add ACL {aclPath} Roles {roleIds} and Group {groupIds}", new object[] { apiACLPath, new string[] { MDCConstants.PVE_ApiRoleId }, new string[] { MDCConstants.PVE_ApiGroupId } });
                var success = await privilegedPVEClient.UpdateAccessControlListAsync(apiACLPath, [ MDCConstants.PVE_ApiRoleId ], [ MDCConstants.PVE_ApiGroupId ], null, cancellationToken);
            }
        }
    }

    private async Task ConfigureLockrolePermissionsAsync(IPVEClientService priviligedPVEClient, CancellationToken cancellationToken = default)
    {
        // Create a role that prevents deletion and changes of VMs when the workspace is locked but allows other operations
        var lockRoleprivileges = new string[]
        {
            "Sys.Audit",
            "VM.Audit",
            "VM.GuestAgent.Unrestricted",
            "VM.PowerMgmt",
            "Datastore.Audit",
            "SDN.Use",
            "Permissions.Modify",
            "VM.Console",
        };

        // Ensure the role is created and has expected permissions
        {
            var roles = await priviligedPVEClient.GetRolesAsync(cancellationToken);
            var role = roles.FirstOrDefault(r => r?["roleId"]?.GetValue<string>() == MDCConstants.PVE_LockRoleId);
            if (role == null)
            {
                var success = await priviligedPVEClient.CreateRoleAsync(MDCConstants.PVE_LockRoleId, lockRoleprivileges, cancellationToken);
                roles = await priviligedPVEClient.GetRolesAsync(cancellationToken);
                role = roles.FirstOrDefault(r => r?["roleId"]?.GetValue<string>() == MDCConstants.PVE_LockRoleId);
            }
            var rolePrivileges = role?["privs"]?.GetValue<string>().Split(',') ?? throw new InvalidOperationException("Unable to retrieve privileges for role.");
            if (!rolePrivileges.Order().SequenceEqual(lockRoleprivileges.Order()))
            {
                var success = await priviligedPVEClient.UpdateRoleAsync(MDCConstants.PVE_LockRoleId, lockRoleprivileges, cancellationToken);
            }
        }
    }

    private async Task ConfigureProxmoxBackupServerAsync(IPVEClientService priviligedPVEClient, CancellationToken cancellationToken = default)
    {
        // Configure Proxmox Backup Server connection used for distributing images
        if (options.Value.ProxmoxBackupServer != null && options.Value.ProxmoxBackupServer.UserName != null && options.Value.ProxmoxBackupServer.Password != null)
        {
            var existingStorage = await priviligedPVEClient.GetStorageAsync(cancellationToken);
            var pbs = existingStorage.FirstOrDefault(i => i?["storage"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Id);

            if (pbs != null)
            {
                // If the parameters are different then recreate the storage
                if (pbs?["server"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Server
                    && pbs?["namespace"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Namespace
                    && pbs?["content"]?.GetValue<string>() == "backup"
                    && pbs?["username"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.UserName
                    && pbs?["datastore"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Datastore
                    && pbs?["fingerprint"]?.GetValue<string>() == options.Value.ProxmoxBackupServer.Fingerprint
                    && pbs?["type"]?.GetValue<string>() == "pbs"
                    )
                {
                    // Validate that backups can be retrieved
                    var backupsTest = await priviligedPVEClient.GetStorageContentAsync("localhost", options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);
                    return; // No Change
                }  

                // Remove then re-create
                await priviligedPVEClient.DeleteStorageAsync(options.Value.ProxmoxBackupServer.Id, cancellationToken);
            }

            // Create
            pbs = await priviligedPVEClient.CreateStorageAsync(
                options.Value.ProxmoxBackupServer.Id,
                options.Value.ProxmoxBackupServer.Server,
                options.Value.ProxmoxBackupServer.Datastore,
                options.Value.ProxmoxBackupServer.Namespace,
                options.Value.ProxmoxBackupServer.UserName,
                options.Value.ProxmoxBackupServer.Password,
                options.Value.ProxmoxBackupServer.Fingerprint, cancellationToken: cancellationToken);

            // Validate that backups can be retrieved
            var backups = await priviligedPVEClient.GetStorageContentAsync("localhost", options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);
        }
    }

    private async Task ConfigureDataGatewayAsync(IPVEClientService priviligedPVEClient, string restoreToNode, PVEStorageContent backupStorageContent, NetworkConfiguration networkConfiguration, bool dataEgressOnMgmtNetwork, CancellationToken cancellationToken = default)
    {
        var resources = await priviligedPVEClient.GetClusterResourcesAsync(cancellationToken);
        
        // If the Data Gateway is not on this node then don't do anything
        var existing = resources.FirstOrDefault(i => i.VmId == backupStorageContent.VMID) ?? throw new InvalidOperationException("The Data Gateway VM was not restored");
        if (existing.Node != restoreToNode) return;

        var vmid = backupStorageContent.VMID ?? throw new InvalidOperationException("Unable to get VMID for Data Gateway VM Backup");
        // Set the VM Network Adapters Config according to the required NetworkConfiguration
        DatacenterSettings datacenterSettings = await priviligedPVEClient.GetDatacenterSettingsAsync(cancellationToken);

        var qemuConfig = await priviligedPVEClient.GetQemuConfigAsync(restoreToNode, vmid, cancellationToken) ?? throw new InvalidOperationException($"Unable to get Qemu Config for Data Gateway VM VMID '{vmid}'.");
        var(wanNetworkAdapter, lanNetworkAdapter) = qemuConfig.ParseGatewayNetworkAdapters();
        if (wanNetworkAdapter == null)
        {
            var deviceIds = Enumerable.Range(0, 2).Select(i => $"vnet{i}");
            var deviceIndex = Enumerable.Range(0, 2);
            wanNetworkAdapter = new PVEQemuConfigNetworkAdapter
            {
                DeviceId = deviceIds.Except([lanNetworkAdapter.DeviceId]).First(),
                DeviceIndex = deviceIndex.Except([lanNetworkAdapter.DeviceIndex]).First()
            };
        }
        wanNetworkAdapter.Bridge = dataEgressOnMgmtNetwork? networkConfiguration.MgmtBridge.NetworkInterfaceName : networkConfiguration.DataBridge.NetworkInterfaceName;  // Data Gateway WAN is DataEgressBridge
        wanNetworkAdapter.Tag = null;   // Data Gateway WAN is always untagged
        wanNetworkAdapter.IsFirewallEnabled = true;
        wanNetworkAdapter.IsDisconnected = null;

        lanNetworkAdapter.Bridge = networkConfiguration.TrunkBridge.NetworkInterfaceName;   // Data Gateway WAN is always TRUNK
        lanNetworkAdapter.Tag = datacenterSettings.WanBridgeTag;    // Data Gateway WAN is always Tagged (default VLAN 2)
        lanNetworkAdapter.IsFirewallEnabled = true;
        lanNetworkAdapter.IsDisconnected = null;

        await priviligedPVEClient.UpdateQemuConfigAsync(restoreToNode, vmid, null, [wanNetworkAdapter, lanNetworkAdapter], [], cancellationToken);
        
        var qemuStatus = await priviligedPVEClient.GetQemuStatusCurrentAsync(restoreToNode, vmid, cancellationToken);
        if (qemuStatus.Qmpstatus == "stopped")
        {
            var vmStatus = await priviligedPVEClient.QemuStatusStartAsync(restoreToNode, vmid, QemuWaitOptions.WaitForState, cancellationToken);
        }
    }

    private async Task<PVEStorageContent[]> GetBackupStorageContentsAsync(IPVEClientService pveClient, string[] names, CancellationToken cancellationToken = default)
    {
        var node = "localhost";
        if (!(options.Value.ProxmoxBackupServer != null && options.Value.ProxmoxBackupServer.UserName != null && options.Value.ProxmoxBackupServer.Password != null))
        {
            throw new InvalidOperationException("Proxmox Backup Server is not configured.");
        }

        var storageContents = await pveClient.GetStorageContentAsync(node, options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);

        List<PVEStorageContent> list = new List<PVEStorageContent>();
        foreach (var name in names)
        {
            var target = storageContents
            .FirstOrDefault(item => item.Content == "backup" && item.SubType == "qemu" && item.VolumeId != null && item.Notes == name);

            if (target == null) throw new InvalidOperationException($"VM Backup '{name}' Not Found.");

            var vmid = target.VMID ?? throw new InvalidOperationException("Unable to determine VMID");

            list.Add(target);
        }

        return list.ToArray();
    }

    private async Task RestoreFromBackupAsync(IPVEClientService pveClient, PVEStorageContent[] storageContents, CancellationToken cancellationToken = default)
    {
        var node = "localhost";
        if (!(options.Value.ProxmoxBackupServer != null && options.Value.ProxmoxBackupServer.UserName != null && options.Value.ProxmoxBackupServer.Password != null))
        {
            throw new InvalidOperationException("Proxmox Backup Server is not configured.");
        }

        // First check if there is an existing qmrestore task running. Only one restore can happen at a time
        var qmRestoreTask = await GetQMRestoreTask(pveClient, cancellationToken);
        if (qmRestoreTask != null) throw new InvalidOperationException("Cannot download template while another download is in progress");

        //var storageContents = await pveClient.GetStorageContentAsync(node, options.Value.ProxmoxBackupServer.Id, "backup", cancellationToken);

        //var target = storageContents
        //    .FirstOrDefault(item => item.Content == "backup" && item.SubType == "qemu" && item.VolumeId != null && item.Notes == name);

        //if (target == null) throw new InvalidOperationException($"VM Backup '{name}' Not Found.");

        //var vmid = target.VMID ?? throw new InvalidOperationException("Unable to determine VMID");
        
        var resources = await pveClient.GetClusterResourcesAsync(cancellationToken);
        var storages = resources.Where(i => i.Type == PVEResourceType.Storage).ToArray();
        var imageStorage = storages.FirstOrDefault(i => (i.Content ?? string.Empty).Split(',').Contains("images")) ?? throw new InvalidOperationException($"Unable to determine storage capacity for Datacenter");

        foreach (var storageContent in storageContents)
        {
            var name = storageContent.Notes;
            var vmid = storageContent.VMID ?? throw new InvalidOperationException($"Unable to determine VMID for backup '{name}'");

            // If the VMID is already used and the VM name is not the expected DataGateway_Name then remove it
            var existing = resources.FirstOrDefault(i => i.VmId == vmid);
            if (existing != null && existing.Name != name)
            {
                var upidStop = await pveClient.QemuStatusStopAsync(existing.Node!, vmid, true, cancellationToken);
                await pveClient.WaitForTaskAsync(existing.Node!, upidStop, cancellationToken);

                var upidDelete = await pveClient.DeleteQemuAsync(existing.Node!, vmid, true, true, cancellationToken);
                await pveClient.WaitForTaskAsync(existing.Node!, upidDelete, cancellationToken);
                existing = null;
            }

            if (existing == null)
            {
                var upidCreate = await pveClient.CreateQemuAsync(node, vmid, true, imageStorage.Id.Split('/').Last(), storageContent.VolumeId, cancellationToken);
                await pveClient.WaitForTaskAsync(node, upidCreate, cancellationToken);
            }
        }
    }

    private static string GeneratePassword(int length)
    {
        const string characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        Random rand = new Random();
        StringBuilder sb = new StringBuilder(length);
        for (int x=0;x<length;x++)
        {
            sb.Append(characters[rand.Next(characters.Length)]);
        }
        return sb.ToString();
    }

    private static bool IsInRange(IPAddress ipToTest, IPAddress rangeStart, IPAddress rangeEnd)
    {
        byte[] testBytes = ipToTest.GetAddressBytes();
        byte[] startBytes = rangeStart.GetAddressBytes();
        byte[] endBytes = rangeEnd.GetAddressBytes();

        // Ensure IP addresses are of the same family (IPv4 or IPv6)
        if (testBytes.Length != startBytes.Length || testBytes.Length != endBytes.Length)
        {
            throw new ArgumentException("IP addresses must be of the same family (IPv4 or IPv6).");
        }

        bool greaterThanOrEqualStart = true;
        bool lessThanOrEqualEnd = true;

        for (int i = 0; i < testBytes.Length; i++)
        {
            if (testBytes[i] < startBytes[i])
            {
                greaterThanOrEqualStart = false;
                break;
            }
            if (testBytes[i] > startBytes[i])
            {
                break; // testBytes[i] is greater, so no need to check further for start
            }
        }

        for (int i = 0; i < testBytes.Length; i++)
        {
            if (testBytes[i] > endBytes[i])
            {
                lessThanOrEqualEnd = false;
                break;
            }
            if (testBytes[i] < endBytes[i])
            {
                break; // testBytes[i] is smaller, so no need to check further for end
            }
        }

        return greaterThanOrEqualStart && lessThanOrEqualEnd;
    }

    private List<(IPAddress start, IPAddress end)> ComputeIPAssignmentPools(ZTNetwork network)
    {
        List<(IPAddress start, IPAddress end)> ipAssignmentPools = new();
        foreach (var pool in network.Config.IpAssignmentPools)
        {
            if (IPAddress.TryParse(pool.IPRangeStart, out var start) && IPAddress.TryParse(pool.IPRangeEnd, out var end))
            {
                ipAssignmentPools.Add((start, end));
            }
        }
        return ipAssignmentPools;
    }

    private MicroDataCenterEndpoint ComputeMicroDataCenterEndpoint(ZTMember member, TokenPVEClientServiceOptions pveClientServiceOptions)
    {
        var ipAddresses = member.Config.IPAssignments?.Select(i => IPAddress.Parse(i)).ToArray();
        return new MicroDataCenterEndpoint
        {
            PVEClientConfiguration = pveClientServiceOptions,
            IPAddresses = ipAddresses ?? [],
            ZTMember = member
        };
    }
    #endregion
}
