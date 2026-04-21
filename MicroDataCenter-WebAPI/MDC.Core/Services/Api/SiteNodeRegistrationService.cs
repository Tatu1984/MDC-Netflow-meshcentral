using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.DtoEnrichment;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Api;

internal class SiteNodeRegistrationService(IMDCDatabaseService databaseService, IOptions<MDCEndpointServiceOptions> mdcEndpointServiceOptions, IMDCEndpointService mdcEndpointService, IZeroTierService zeroTierService, IOptions<SiteRegistrationServiceOptions> siteRegistrationServiceOptions, ILogger<SiteNodeRegistrationService> logger, IPVEClientFactory pveClientFactory, IMemoryCache memoryCache, ITenantContext tenantContext, ISiteService siteService, IDtoEnrichmentService dtoEnrichment) : ISiteNodeRegistrationService
{
    public async Task<IEnumerable<SiteNodeRegistration>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        // Query
        var query = databaseService.GetSiteNodeRegistrations();

        // Project
        var dtoQuery = query.Select(DtoProjections.ToSiteNodeRegistration);

        // Apply OData clauses and Materialize to DTO
        var results = tenantContext.ApplyToAndMaterialize<SiteNodeRegistration>(dtoQuery);

        // Enrich
        await dtoEnrichment.EnrichAsync(results, cancellationToken);

        return results;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dbSiteNodeRegistration = await databaseService.GetSiteNodeRegistrationByIdAsync(id, cancellationToken);

        // If there was a node registration to delete, attempt to remove the corresponding member from the ZeroTier network to ensure that the node can no longer access the network.
        if (dbSiteNodeRegistration != null && dbSiteNodeRegistration.MemberAddress != null)
        {
            // If there are any Site Nodes with this member's name then the Registration cannot be deleted, but instead the Site Node API needs to be used to deauthorize the node and remove it from the Site, which will then remove the member from the ZeroTier network.
            // So only attempt to delete the member if there are no Site Nodes with this member's name.
            var dbSiteNode = await databaseService.GetSiteNodeAsync(dbSiteNodeRegistration.MemberAddress, cancellationToken);
            if (dbSiteNode != null)
            {
                throw new InvalidOperationException($"Site Node Registration for id '{id}' cannot be removed because the Site Node is active with Site Id '{dbSiteNode.SiteId}'.  Use the Site API to remove Site Node.");
            }

            await zeroTierService.DeleteNetworkMemberAsync(mdcEndpointServiceOptions.Value.MgmtNetworkId, dbSiteNodeRegistration.MemberAddress, cancellationToken);
        }

        await databaseService.DeleteSiteNodeRegistrationAsync(id, cancellationToken);
    }

    // See https://pve.proxmox.com/wiki/Automated_Installation
    // RequestAutoInstallationAsync will be called by the Proxmox Auto Installation Assistant during the pre-installation phase of the Proxmox VE installation.  The system information sent by the assistant will be used to create an answer file that will be used to configure the installation.
    // The answer file will be returned to the assistant and used during the installation process.
    // Bootable ISO is created by running:
    //  proxmox-auto-install-assistant prepare-iso ./proxmox-ve_9.1-1.iso --fetch-from http --url "https://10.10.72.84:7078/api/ZTP/register" --cert-fingerprint "f8:eb:30:bb:c0:41:49:6b:2f:63:53:ad:6f:b6:e6:55:63:4d:c7:59:8b:2a:46:9c:d6:e7:87:02:49:58:ef:45"
    //  proxmox-auto-install-assistant prepare-iso ./proxmox-ve_9.1-1.iso --fetch-from http --url "https://api.edge.tensparrows.com/api/ZTP/register" --cert-fingerprint "cc:44:d0:32:a2:0d:84:07:d0:17:b9:db:14:c0:d3:a2:3f:1d:2f:b2:45:45:17:e4:77:4f:e0:fe:f6:bc:ca:99"
    public async Task<string> RequestAutoInstallationAsync(JsonNode systemInformation, CancellationToken cancellationToken = default)
    {
        var uuid = systemInformation["dmi"]?["system"]?["uuid"]?.GetValue<string>();
        if (uuid == null) throw new InvalidOperationException("Unable to register.  System information is missing UUID value.");

        StringBuilder answer = new StringBuilder();

        answer.AppendLine(CreateAnswerFileSection("global", new Dictionary<string, object>()
        {
            { "keyboard", siteRegistrationServiceOptions.Value.Keyboard },
            { "country", siteRegistrationServiceOptions.Value.Country },
            { "fqdn", $"{uuid}.{siteRegistrationServiceOptions.Value.DomainName}" },
            { "mailto", siteRegistrationServiceOptions.Value.MailTo },
            { "timezone", siteRegistrationServiceOptions.Value.Timezone },
            { "root-password", siteRegistrationServiceOptions.Value.RootPassword },    // SDNlab123
        }));
        answer.AppendLine();

        answer.AppendLine(CreateAnswerFileSection("network", new Dictionary<string, object>()
        {
            { "source", "from-dhcp" }   // Set source as from-dhcp instead of a static IP to ensure that multiple hosts on the same network do not get an IP conflict
        }));
        answer.AppendLine();

        answer.AppendLine(CreateAnswerFileSection("network.interface-name-pinning", new Dictionary<string, object>()
        {
            { "enabled", true }
        }));
        answer.AppendLine();

        // TODO mapping
        //answer.AppendLine(CreateAnswerFileSection("network.interface-name-pinning.mapping", new Dictionary<string, object>()
        //{
        //    { "enabled", true }
        //}));
        //answer.AppendLine();

        answer.AppendLine(CreateAnswerFileSection("disk-setup", new Dictionary<string, object>()
        {
            { "filesystem", "ext4" },
            // { "hdsize", "100" },   -  don't auto-set hd to 100GB for now, this would be needed when setting up a cluster, allocating disks for CEPH, etc.  There are number of manual steps that have to be done with that anyway.   But setting hdsize here would negatively impact the single-node auto install .
            // { "disk-list", new string[] { "sda" } }
            { "filter_match", "any" },
            { "filter.ID_SERIAL", "*" }
        }));
        answer.AppendLine();

        // Post Installation Webhook Section
        var apiKey = Guid.NewGuid();
        var cacheEntry = memoryCache.Set(apiKey.ToString(), new CacheItem
        { 
            Uuid = Guid.Parse(uuid),
            SystemInformation = systemInformation
        }, TimeSpan.FromMinutes(10));   // Expire the apiKey in 10 minute; The auto-install workflow must complete within this time

        var postInstallationWebhookSection = new Dictionary<string, object>()
        {
            { "url", $"{siteRegistrationServiceOptions.Value.PostInstallationWebhookUrl.TrimEnd('/')}/{uuid}?apiKey={apiKey}" } // <base URL>/api/ZTP/notify
        };
        if (siteRegistrationServiceOptions.Value.PostInstallationWebhookFingerprint != null)
        {
            postInstallationWebhookSection.Add("cert-fingerprint", siteRegistrationServiceOptions.Value.PostInstallationWebhookFingerprint); // Certificate Fingerprint, as hex, such as: "f8:eb:30:bb:c0:41:49:6b:2f:63:53:ad:6f:b6:e6:55:63:4d:c7:59:8b:2a:46:9c:d6:e7:87:02:49:58:ef:45" )
        }
        answer.AppendLine(CreateAnswerFileSection("post-installation-webhook", postInstallationWebhookSection));
        answer.AppendLine();

        // First Boot Webhook Section
        var firstBootSection = new Dictionary<string, object>()
        {
            { "source", "from-url" },
            { "ordering", "fully-up" }, // Must use fully-up and not network-online because at the end of the first-boot script there is a call to MDC to notify that first-boot is complete, which will then perform the ApproveAsync method below, and that method does call back to the Proxmox API. If ProxMox api is not running then attempting privilged login will fail with error doce 502
            { "url", $"{siteRegistrationServiceOptions.Value.FirstBootUrl.TrimEnd('/')}/{uuid}?apiKey={apiKey}" } //  "https://10.10.72.84:7078/api/ZTP/firstboot"
        };
        if (siteRegistrationServiceOptions.Value.FirstBootFingerprint != null)
        {
            firstBootSection.Add("cert-fingerprint", siteRegistrationServiceOptions.Value.FirstBootFingerprint); // Certificate Fingerprint, as hex, such as: "f8:eb:30:bb:c0:41:49:6b:2f:63:53:ad:6f:b6:e6:55:63:4d:c7:59:8b:2a:46:9c:d6:e7:87:02:49:58:ef:45" )
        }
        answer.AppendLine(CreateAnswerFileSection("first-boot", firstBootSection));
        answer.AppendLine();

        return answer.ToString();
    }

    private (string, CacheItem) Validate(Guid uuid)
    {
        var apiKey = tenantContext.ObjectId?.ToString() ?? throw new UnauthorizedAccessException();
        if (!memoryCache.TryGetValue<CacheItem>(apiKey, out var cacheItem) || cacheItem == null) throw new InvalidOperationException("Expired Device Registration Request");
        if (cacheItem.Uuid != uuid) throw new InvalidOperationException("Device Registration Request Mismatch");
        return (apiKey, cacheItem);
    }

    // See https://github.com/community-scripts/ProxmoxVE/blob/main/tools/pve/post-pve-install.sh
    // GetFirstBootScript will be called by the Proxmox Auto Installation Assistant during the first boot phase of the Proxmox VE installation.  The script returned by this method will be executed on the Proxmox VE host during the first boot after the installation is complete.  The script can be used to perform any necessary configuration or setup that needs to be done on the first boot after installation.
    public async Task<string> GetFirstBootScriptAsync(Guid uuid, CancellationToken cancellationToken)
    {
        var (apiKey, cacheItem) = Validate(uuid);

        var dbSiteNodeRegistration = await databaseService.GetSiteNodeRegistrations().FirstOrDefaultAsync(s => s.UUID == uuid, cancellationToken);
        if (dbSiteNodeRegistration == null)
        {
            dbSiteNodeRegistration = await databaseService.CreateSiteNodeRegistrationAsync(uuid, cacheItem.SystemInformation, cancellationToken);
        }

        StringBuilder firstBootScript = new StringBuilder();
        firstBootScript.AppendLine("#!/bin/sh");

        firstBootScript.AppendLine("echo \"Begin MDC First-Boot\"");

        // Configure Proxmox host to get a separate DHCP IP on the same bridge network
        firstBootScript.AppendLine(@"
echo ""Configuring DHCP macvlan admin interface...""

INTERFACES_FILE=""/etc/network/interfaces""
DHCLIENT_FILE=""/etc/dhcp/dhclient.conf""

#########################################
# Add mvlan0 interface if not present
#########################################
if ! grep -q ""iface mvlan0 inet dhcp"" $INTERFACES_FILE; then
    echo """" >> $INTERFACES_FILE
    echo ""auto mvlan0"" >> $INTERFACES_FILE
    echo ""iface mvlan0 inet dhcp"" >> $INTERFACES_FILE
    echo ""    pre-up /sbin/ip link add link vmbr0 name mvlan0 type macvlan mode bridge"" >> $INTERFACES_FILE
    echo ""    post-down /sbin/ip link del mvlan0"" >> $INTERFACES_FILE
    echo ""    metric 10"" >> $INTERFACES_FILE
    echo ""Added mvlan0 DHCP interface""
else
    echo ""mvlan0 already configured""
fi

#########################################
# Ensure vmbr0 has metric 15
#########################################
if grep -q ""^iface vmbr0"" $INTERFACES_FILE; then
    # Check if metric already exists under vmbr0
    if ! awk '/^iface vmbr0/,/^\s*$/ {print}' $INTERFACES_FILE | grep -q ""metric""; then
        echo ""Adding metric 15 to vmbr0...""

        awk '
        BEGIN {added=0}
        /^iface vmbr0/ {print; in_block=1; next}
        in_block && /^\s*$/ && !added {
            print ""    metric 15""
            added=1
            in_block=0
        }
        {print}
        ' $INTERFACES_FILE > ${INTERFACES_FILE}.tmp

        mv ${INTERFACES_FILE}.tmp $INTERFACES_FILE
    else
        echo ""vmbr0 already has a metric configured""
    fi
else
    echo ""vmbr0 interface not found""
fi

#########################################
# Ensure dhclient.conf settings
#########################################
add_or_update_dhcp_param () {
    PARAM_NAME=$1
    PARAM_VALUE=$2

    if grep -q ""^$PARAM_NAME"" $DHCLIENT_FILE; then
        sed -i ""s/^$PARAM_NAME.*/$PARAM_NAME $PARAM_VALUE;/"" $DHCLIENT_FILE
    else
        echo ""$PARAM_NAME $PARAM_VALUE;"" >> $DHCLIENT_FILE
    fi
}

add_or_update_dhcp_param ""timeout"" ""30""
add_or_update_dhcp_param ""retry"" ""10""
add_or_update_dhcp_param ""reboot"" ""0""

echo ""Updated dhclient.conf""

#########################################
# Restart networking and renew DHCP
#########################################
ifdown mvlan0 2>/dev/null || true
ifup mvlan0 || true

dhclient -v mvlan0 || true

echo ""Admin DHCP interface configuration complete.""
");

        // Disable pve-enterprise repository
        firstBootScript.AppendLine(@"
echo ""Disable pve-enterprise repository""
for file in /etc/apt/sources.list.d/*.sources; do
    if grep -q ""Components:.*pve-enterprise"" ""$file""; then
        if grep -q ""^Enabled:"" ""$file""; then
        sed -i 's/^Enabled:.*/Enabled: false/' ""$file""
        else
        echo ""Enabled: false"" >>""$file""
        fi
    fi
done
");

        // Disable ceph-enterprise repository
        firstBootScript.AppendLine(@"
echo ""Disable ceph-enterprise repository""
for file in /etc/apt/sources.list.d/*.sources; do
    if grep -q ""enterprise.proxmox.com.*ceph"" ""$file""; then
        if grep -q ""^Enabled:"" ""$file""; then
        sed -i 's/^Enabled:.*/Enabled: false/' ""$file""
        else
        echo ""Enabled: false"" >>""$file""
        fi
    fi
    done
");
        // Add pve-no-subscription repository
        firstBootScript.AppendLine(@"
echo ""Add pve-no-subscription repository""
cat >/etc/apt/sources.list.d/proxmox.sources <<EOF
Types: deb
URIs: http://download.proxmox.com/debian/pve
Suites: trixie
Components: pve-no-subscription
Signed-By: /usr/share/keyrings/proxmox-archive-keyring.gpg
EOF
");

        // Update Proxmox VE

        //        firstBootScript.AppendLine(@"
        //echo ""Update Proxmox VE""
        //apt update
        //apt -y dist-upgrade
        //");

        // Note: Update apt but don't apply upgrade because then first-boot will take alot longer and reboot will be required, which can cause issues with the auto installation user experience.  Instead, the user can apply updates after the installation is complete and the node is registered with MDC.
        firstBootScript.AppendLine(@"
echo ""Update Proxmox VE""
apt update
");

        // (Single Node) Disable unnecessary high availability and corosync
        firstBootScript.AppendLine(@"
echo ""(Single Node) Disable unnecessary high availability and corosync""
systemctl disable -q --now pve-ha-lrm
systemctl disable -q --now pve-ha-crm
systemctl disable -q --now corosync
");

        // Disable nag message
        firstBootScript.AppendLine(@"
echo ""Disable nag message""
mkdir -p /usr/local/bin
    cat >/usr/local/bin/pve-remove-nag.sh <<'EOF'
#!/bin/sh
WEB_JS=/usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js
if [ -s ""$WEB_JS"" ] && ! grep -q NoMoreNagging ""$WEB_JS""; then
    echo ""Patching Web UI nag...""
    sed -i -e ""/data\.status/ s/!//"" -e ""/data\.status/ s/active/NoMoreNagging/"" ""$WEB_JS""
fi

MOBILE_TPL=/usr/share/pve-yew-mobile-gui/index.html.tpl
MARKER=""<!-- MANAGED BLOCK FOR MOBILE NAG -->""
if [ -f ""$MOBILE_TPL"" ] && ! grep -q ""$MARKER"" ""$MOBILE_TPL""; then
    echo ""Patching Mobile UI nag...""
    printf ""%s\n"" \
      ""$MARKER"" \
      ""<script>"" \
      ""  function removeSubscriptionElements() {"" \
      ""    // --- Remove subscription dialogs ---"" \
      ""    const dialogs = document.querySelectorAll('dialog.pwt-outer-dialog');"" \
      ""    dialogs.forEach(dialog => {"" \
      ""      const text = (dialog.textContent || '').toLowerCase();"" \
      ""      if (text.includes('subscription')) {"" \
      ""        dialog.remove();"" \
      ""        console.log('Removed subscription dialog');"" \
      ""      }"" \
      ""    });"" \
      """" \
      ""    // --- Remove subscription cards, but keep Reboot/Shutdown/Console ---"" \
      ""    const cards = document.querySelectorAll('.pwt-card.pwt-p-2.pwt-d-flex.pwt-interactive.pwt-justify-content-center');"" \
      ""    cards.forEach(card => {"" \
      ""      const text = (card.textContent || '').toLowerCase();"" \
      ""      const hasButton = card.querySelector('button');"" \
      ""      if (!hasButton && text.includes('subscription')) {"" \
      ""        card.remove();"" \
      ""        console.log('Removed subscription card');"" \
      ""      }"" \
      ""    });"" \
      ""  }"" \
      """" \
      ""  const observer = new MutationObserver(removeSubscriptionElements);"" \
      ""  observer.observe(document.body, { childList: true, subtree: true });"" \
      ""  removeSubscriptionElements();"" \
      ""  setInterval(removeSubscriptionElements, 300);"" \
      ""  setTimeout(() => {observer.disconnect();}, 10000);"" \
      ""</script>"" \
      """" >> ""$MOBILE_TPL""
fi
EOF
    chmod 755 /usr/local/bin/pve-remove-nag.sh

    cat >/etc/apt/apt.conf.d/no-nag-script <<'EOF'
DPkg::Post-Invoke { ""/usr/local/bin/pve-remove-nag.sh""; };
EOF
    chmod 644 /etc/apt/apt.conf.d/no-nag-script

    apt --reinstall install proxmox-widget-toolkit
");

        // Install ZeroTier, join the management network, and notify MDC to link the device uuid with the zerotier node id
        firstBootScript.AppendLine(@"
echo ""Install Zerotier""
curl -s https://install.zerotier.com | bash");
        firstBootScript.AppendLine($"zerotier-cli join {mdcEndpointServiceOptions.Value.MgmtNetworkId}");
        firstBootScript.AppendLine($"NETWORK_ID=\"{mdcEndpointServiceOptions.Value.MgmtNetworkId}\"");

        // TODO: Bind the ProxMox administration interface to the ZeroTier interface to ensure that the ProxMox VE host is only accessible through the ZeroTier network.  This can be done by creating a new network interface that is bound to the ZeroTier interface and configuring ProxMox to use that interface for management traffic.

        // Call back to MDC API to link the device uuid with the zerotier node id, and regsiter the site with MDC
        firstBootScript.AppendLine($"curl -k -X POST \"{siteRegistrationServiceOptions.Value.FirstBootUrl.TrimEnd('/')}/{uuid}?apiKey={apiKey}\" -H \"Content-Type: application/json\" -d \"{{\\\"nodeId\\\": \\\"$(zerotier-cli info | cut -d ' ' -f 3)\\\"}}\"");
        
        // Completed
        firstBootScript.AppendLine("echo \"MDC First-Boot Completed\"");

        // Reboot
        //        firstBootScript.AppendLine(@"
        //echo ""Reboot after first-boot""
        //reboot");

        return firstBootScript.ToString().Replace("\r\n", "\n");
    }

    public async Task<SiteNodeRegistration> NotifyAutoInstallationAsync(Guid uuid, JsonNode deviceInformation, CancellationToken cancellationToken = default)
    {
        var (apiKey, cacheItem) = Validate(uuid);  // Ensure this request matches the uuid

        var dbSiteNodeRegistration = await databaseService.UpdateSiteNodeRegistrationAsync(uuid, deviceInformation, null, false, cancellationToken);
        return new SiteNodeRegistration
        {
            Id = dbSiteNodeRegistration.Id,
            UUID = dbSiteNodeRegistration.UUID,
            SerialNumber = dbSiteNodeRegistration.SerialNumber,
            MemberAddress = dbSiteNodeRegistration.MemberAddress,
            CreatedAt = dbSiteNodeRegistration.CreatedAt,
            DeviceInfo = dbSiteNodeRegistration.DeviceInfo
        };
    }

    public async Task<SiteNodeRegistration> CompleteFirstBootAsync(Guid uuid, JsonNode firstBootInformation, CancellationToken cancellationToken = default)
    {
        var (apiKey, cacheItem) = Validate(uuid);  // Ensure this request matches the uuid

        var memberAddress = firstBootInformation["nodeId"]?.GetValue<string>() ?? throw new InvalidOperationException("First boot information must contain a nodeId.");

        // Update the registration record with the memberAddress, which is now known.
        var dbSiteNodeRegistration = await databaseService.UpdateSiteNodeRegistrationAsync(uuid, null, memberAddress, false, cancellationToken);

        // Find the member registered in ZeroTier with the provided nodeId to ensure that the node has successfully joined the ZeroTier network before completing the site node registration. 
        // Use wait for membership request API to wait for the member to appear in the ZeroTier network, which indicates that the node has successfully joined the network and is ready to be registered with MDC.
        // Since there is not Site established yet, use the default DatacenterSettings for the wait for membership request API call, which will be used to determine the timeout and polling delay for waiting for the member to appear in the ZeroTier network.
        var member = await zeroTierService.GetNetworkMemberByIdAsync(mdcEndpointServiceOptions.Value.MgmtNetworkId, memberAddress, true, new DatacenterSettings(), cancellationToken);
        member = await zeroTierService.WaitForMemberOnlineAsync(mdcEndpointServiceOptions.Value.MgmtNetworkId, memberAddress, cancellationToken);

        // Note: Don't authorize the site automatically here;  Authorization can be repeated which will also apply any updates the node require by MDC, so let this site authorization done done in a subsequent call.
        // Now authorize the site

        try
        {
            var (site, siteNode) = await ApproveAsync(uuid, new SiteNodeRegistrationApprovalDescriptor(), cancellationToken);

            return new SiteNodeRegistration
            {
                Id = dbSiteNodeRegistration.Id,
                UUID = dbSiteNodeRegistration.UUID,
                SerialNumber = dbSiteNodeRegistration.SerialNumber,
                MemberAddress = dbSiteNodeRegistration.MemberAddress,
                CreatedAt = dbSiteNodeRegistration.CreatedAt,
                CompletedAt = dbSiteNodeRegistration.CompletedAt,
                DeviceInfo = dbSiteNodeRegistration.DeviceInfo,
                Online = siteNode.Online,
                Authorized = siteNode.Authorized,
                SiteId = dbSiteNodeRegistration.SiteNode?.SiteId,
                SiteNodeId = dbSiteNodeRegistration.SiteNodeId
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error approving site node registration for UUID '{uuid}' and Member Address '{memberAddress}'.", uuid, memberAddress);
        }

        return new SiteNodeRegistration
        {
            Id = dbSiteNodeRegistration.Id,
            UUID = dbSiteNodeRegistration.UUID,
            SerialNumber = dbSiteNodeRegistration.SerialNumber,
            MemberAddress = dbSiteNodeRegistration.MemberAddress,
            CreatedAt = dbSiteNodeRegistration.CreatedAt,
            CompletedAt = dbSiteNodeRegistration.CompletedAt,
            DeviceInfo = dbSiteNodeRegistration.DeviceInfo
        };
    }

    public async Task<(Site, SiteNode)> ApproveAsync(Guid uuid, SiteNodeRegistrationApprovalDescriptor approveDescriptor, CancellationToken cancellationToken = default)
    {
        string userName = "root@pam";
        bool validateServerCertificate = false;
        int port = 8006;
        int timeout = 30;

        var dbSiteNodeRegistration = databaseService.GetSiteNodeRegistrations()
            .Include(i => i.SiteNode)
            .ThenInclude(i => i == null ? null : i.Site)
            .FirstOrDefault(i => i.UUID == uuid) ?? throw new InvalidOperationException("Site node registration not found.");
        var memberAddress = dbSiteNodeRegistration.MemberAddress ?? throw new InvalidOperationException("Site node registration is missing member address.");
        var deviceInfo = dbSiteNodeRegistration.DeviceInfo ?? throw new InvalidOperationException("Site node registration is missing DeviceInfo.");
        var machineId = Guid.ParseExact(JsonNode.Parse(deviceInfo)?["machine-id"]?.GetValue<string>() ?? throw new InvalidOperationException("Site node registration is DeviceInfo has an invalid machine-id."), "N");

        // Now authorize the site node
        logger.LogInformation("Approve Site Node with Member Address '{memberAddress}'.", memberAddress);
        var member = await mdcEndpointService.AuthorizeMicroDatacenterMemberAsync(memberAddress, cancellationToken);

        // Before making changes, Get the cluster information using privileged access
        var priviligedPVEClient = await mdcEndpointService.CreatePrivilegedPVEClient(memberAddress, userName, siteRegistrationServiceOptions.Value.RootPassword, port, validateServerCertificate, timeout, cancellationToken);
        var clusterStatus = await priviligedPVEClient.GetClusterStatusAsync(cancellationToken);
        logger.LogInformation("Privileged PVE Client for Site Node with Member Address '{memberAddress}' fetched Cluster Status '{@clusterStatus}'.", memberAddress, clusterStatus);
        var siteName = clusterStatus.GetClusterNode().Name;
        var siteNodeName =  clusterStatus.GetLocalNode().Name;

        // Check if the Site is already registered 
        var dbSite = dbSiteNodeRegistration.SiteNode?.Site;
        if (dbSite == null)
        {
            logger.LogInformation("Creating new Site named '{siteName}' from Site Node with Member Address '{memberAddress}'.", siteName, memberAddress);

            // Always create new Site registration (API token) when creating a new Site
            var newEndpoint = await mdcEndpointService.RegisterMicroDataCenterAsync(memberAddress, siteNodeName, userName, siteRegistrationServiceOptions.Value.RootPassword, port, validateServerCertificate, timeout, cancellationToken);

            // Site does not exist in database so create it
            dbSite = await databaseService.CreateSiteAsync(siteName, siteName, newEndpoint.PVEClientConfiguration.TokenId, newEndpoint.PVEClientConfiguration.Secret, cancellationToken);
        }

        // Always Create or update the Site Node in the database
        logger.LogInformation("With UUID {uuid} Create Site Node with Member Address '{memberAddress}', Machine Id '{machineId}' named '{siteNodeName}' having Serial Number '{}' to Site named '{siteName}' Site Id '{siteId}'.", uuid, memberAddress, machineId, siteNodeName, dbSiteNodeRegistration.SerialNumber, siteName, dbSite.Id);
        var dbSiteNode = await databaseService.CreateSiteNodeAsync(dbSite.Id, machineId, memberAddress, siteNodeName, dbSiteNodeRegistration.SerialNumber, port, validateServerCertificate, cancellationToken);

        dbSiteNodeRegistration = await databaseService.AssignSiteNodeRegistrationAsync(dbSiteNodeRegistration.Id, dbSiteNode.Id, cancellationToken);

        // Check to see if the Site node is already registered 
        //var dbSiteNode = await databaseService.GetSiteNodeAsync(memberAddress, cancellationToken);
        //if (dbSiteNode == null)
        //{
        //    logger.LogInformation("Adding Site Node with Member Address '{memberAddress}' named '{siteNodeName}' to Site named '{siteName}' Site Id '{siteId}'.", memberAddress, siteNodeName, siteName, dbSite.Id);

        //    // Create the Site Node in the database
        //    dbSiteNode = await databaseService.CreateSiteNodeAsync(dbSite.Id, dbSiteNodeRegistration.MachineId, memberAddress, siteNodeName, dbSiteNodeRegistration.SerialNumber, port, validateServerCertificate, cancellationToken);
        //}

        // Ensure that the Site Node belongs to the site - in case the MemberAddress finds an existing SiteNode that does not belong to the site looked up by name
        if (dbSiteNode.SiteId != dbSite.Id)
        {
            throw new InvalidOperationException($"Member Address {memberAddress} is Site Node {siteNodeName} for Site {siteName} but is already registered for a different Site.");
        }

        {
            // Verify that the Site credentials still work and create new Registration if it does not
            var mdcEndpoint = await mdcEndpointService.GetMicroDataCenterEndpointAsync(dbSiteNode.MemberAddress, dbSite.ApiTokenId, dbSite.ApiSecret, dbSiteNode.ApiPort, dbSiteNode.ApiValidateServerCertificate, cancellationToken);
            var pveClient = pveClientFactory.Create(mdcEndpoint);
            try
            {
                var verifyClusterStatus = await pveClient.GetClusterStatusAsync(cancellationToken);
                logger.LogInformation("Verified API Token Access to Site '{siteName}' using Site Node '{siteNodeName}'  Cluster Status '{@clusterStatus}'.", siteName, siteNodeName, verifyClusterStatus);
            }
            catch (Exception)   // TODO: catch a Not Authorized exception then re-register the MicroDatacenter
            {
                mdcEndpoint = await mdcEndpointService.RegisterMicroDataCenterAsync(memberAddress, siteNodeName, userName, siteRegistrationServiceOptions.Value.RootPassword, port, validateServerCertificate, timeout, cancellationToken);
                dbSite = await databaseService.UpdateSiteAsync(dbSite.Id, null, null, mdcEndpoint.PVEClientConfiguration.TokenId, mdcEndpoint.PVEClientConfiguration.Secret, null, null, cancellationToken);
            }
        }

        // Ensure the Site is Configured to be a MicroDatacenter
        await mdcEndpointService.ConfigureSiteAsync(dbSiteNode, priviligedPVEClient, new ConfigureSiteParameters { DataEgressOnMgmtNetwork = approveDescriptor.DataEgressOnMgmtNetwork ?? false, SkipNetworkConfiguration = approveDescriptor.SkipNetworkConfiguration ?? false },cancellationToken);

        dbSiteNodeRegistration = await databaseService.UpdateSiteNodeRegistrationAsync(uuid, null, memberAddress, true, cancellationToken);

        logger.LogInformation("Machine Id {machineId} with Serial Number {serialNumber} approved for Site {siteName} as SiteNode {siteNodeName}", machineId, dbSiteNodeRegistration.SerialNumber, siteName, dbSiteNode.Name);

        dbSite = await databaseService.GetAllSites().Include(i => i.SiteNodes).SingleAsync(i => i.Id == dbSite.Id, cancellationToken);
        var site = await siteService.GetByIdAsync(dbSite.Id, cancellationToken) ?? throw new InvalidOperationException($"Site '{siteName}' not found.");
        //var site = await datacenterFactoryService.ComputeSiteDetailAsync(dbSite, cancellationToken); //.FirstOrDefault() ?? throw new InvalidOperationException($"Site '{siteName}' not found.");
        var siteNode = site.SiteNodes.FirstOrDefault(n => n.Name == dbSiteNode.Name) ?? throw new InvalidOperationException($"Site Node with Name '{dbSiteNode.Name}' not found for Site '{siteName}'.");
        return (site, siteNode);
    }

    public bool ValidateApiKey(string apiKey)
    {
        if (!memoryCache.TryGetValue(apiKey, out CacheItem? cacheItem) || cacheItem == null)
            return false;
        return true;
    }

    private class CacheItem
    {
        public required Guid Uuid { get; set; }
        public required JsonNode SystemInformation { get; set; }
    }

    #region Private
    private string CreateAnswerFileSection(string sectionName, Dictionary<string, object> values)
    {
        StringBuilder str = new StringBuilder();
        str.AppendLine($"[{sectionName}]");
        foreach (var value in values)
        {
            str.AppendLine(ToTOMLLine(value));
        }

        return str.ToString();
    }

    private string ToTOMLLine(KeyValuePair<string, object> pair)
    {
        return $"{pair.Key} = {ToTOMLValue(pair.Value)}";
    }

    private string ToTOMLValue(object value)
    {
        if (value == null) return string.Empty;

        return value switch
        {
            string s => $"\"{s}\"",
            bool b => $"{b.ToString().ToLower()}",
            string[] a => $"[{string.Join(',', a.Select(i => $"\"{i}\""))}]",
            _ => Convert.ToString(value) ?? string.Empty
        };
    }
    #endregion
}
