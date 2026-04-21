using MDC.Core.Models;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Shared.Models;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZeroTierService(HttpClient httpClient, IOptions<MDCEndpointServiceOptions> mdcEndpointOptions) : IZeroTierService
{
    public async Task<ZTStatus> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        var response = await httpClient.GetAsync("controller/status", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTStatus>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to get ZeroTier status.");
    }

    //public async Task<ZTControllerStatus> GetControllerStatusAsync(CancellationToken cancellationToken = default)
    //{
    //    var response = await httpClient.GetAsync("controller/status", cancellationToken);
    //    var responseMessage = response.EnsureSuccessStatusCode();
    //    return (await responseMessage.Content.ReadFromJsonAsync<ZTControllerStatus>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to get ZeroTier Controller status.");
    //}

    public async Task<ZTNetwork[]> GetNetworksAsync(CancellationToken cancellationToken = default)
    {
        var response = await httpClient.GetAsync("api/network", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTNetwork[]>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to get ZeroTier Controller Networks.");
    }

    public async Task<ZTNetwork> GetNetworkByIdAsync(string networkId, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.GetAsync($"api/network/{networkId}", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTNetwork>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to get details of ZeroTier Controller Network {networkId}.");
    }

    public async Task<ZTMember[]> GetManagementNetworkMembersAsync(CancellationToken cancellationToken = default)
    {
        var response = await httpClient.GetAsync($"api/network/{mdcEndpointOptions.Value.MgmtNetworkId}/member", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTMember[]>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to get Members of ZeroTier Controller Management Network.");
    }

    public async Task<ZTMember[]> GetNetworkMembersAsync(string networkId, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.GetAsync($"api/network/{networkId}/member", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTMember[]>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to get Members of ZeroTier Controller Network {networkId}.");
    }

    public async Task<ZTMember> GetNetworkMemberByIdAsync(string networkId, string memberId, bool waitForNetworkMembershipRequest, DatacenterSettings? datacenterSettings, CancellationToken cancellationToken = default)
    {
        if (waitForNetworkMembershipRequest && datacenterSettings == null) throw new ArgumentNullException(nameof(datacenterSettings), $"DatacenterSettings must be provided when waiting for Network Membership Request.");

        var stopwatch = Stopwatch.StartNew();
        do
        {
            try
            {
                var response = await httpClient.GetAsync($"api/network/{networkId}/member/{memberId}", cancellationToken);
                var responseMessage = response.EnsureSuccessStatusCode();
                var member = await responseMessage.Content.ReadFromJsonAsync<ZTMember>(cancellationToken);
                if (member != null)
                {
                    return member;
                }
            }
            catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                // Do nothing, wait 
            }
            catch (Exception ex)
            {
                var str = ex.Message;
            }

            if (!waitForNetworkMembershipRequest || datacenterSettings == null)
            {
                throw new InvalidOperationException($"Unable to get details of ZeroTier Controller Network {networkId} member {memberId}.");
            }

            if (stopwatch.Elapsed.TotalSeconds > datacenterSettings.WaitForZeroTierMembershipRequestTimeoutSeconds)
                throw new TimeoutException($"Waiting for Network Membership Request of Node '{memberId}' timed out after {datacenterSettings.WaitForZeroTierMembershipRequestTimeoutSeconds} seconds.");

            await Task.Delay(datacenterSettings.WaitForZeroTierMembershipRequestPollingDelayMilliseconds, cancellationToken);
        } while (true);
    }

    public async Task DeleteNetworkAsync(string networkId, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.DeleteAsync($"api/network/{networkId}", cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<ZTNetwork> CreateNetworkAsync(string networkName, VirtualNetworkDescriptor virtualNetworkDescriptor, DatacenterSettings datacenterSettings, CancellationToken cancellationToken = default)
    {
        var networkDefinition = new JsonObject
        {
            ["config"] = new JsonObject
            {
                ["name"] = networkName,
                ["private"] = true,
                ["ipAssignmentPools"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["ipRangeStart"] = virtualNetworkDescriptor.RemoteNetworkIPRangeStart ?? datacenterSettings.DefaultRemoteNetworkIPRangeStart,
                        ["ipRangeEnd"] = virtualNetworkDescriptor.RemoteNetworkIPRangeEnd ?? datacenterSettings.DefaultRemoteNetworkIPRangeEnd
                    }
                },
                ["routes"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["target"] = virtualNetworkDescriptor.RemoteNetworkAddressCIDR ??  datacenterSettings.DefaultRemoteNetworkAddressCIDR,
                        ["via"] = null
                    }
                },
                ["v4AssignMode"] = new JsonObject
                {
                    ["zt"] = true
                },
                ["enableBroadcast"] = true
            }
        };

        var response = await httpClient.PostAsJsonAsync("api/network", networkDefinition, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTNetwork>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to create ZeroTier Network.");
    }

    public async Task<ZTNetwork> UpdateNetworkAsync(string networkId, ZTNetworkConfigIPAssignmentPool[]? ipAssignmentPools, ZTNetworkConfigRoute[]? routes, CancellationToken cancellationToken = default)
    {
        if (networkId == mdcEndpointOptions.Value.MgmtNetworkId) throw new InvalidOperationException("Updating the MGMT Network is Not Allowed");

        var config = new JsonObject();
        
        if (ipAssignmentPools != null)
        {
            var configIpAssignmentPools = new JsonArray();
            foreach (var ipAssignmentPool in ipAssignmentPools)
            {
                configIpAssignmentPools.Add(new JsonObject
                {
                    ["ipRangeStart"] = ipAssignmentPool.IPRangeStart,
                    ["ipRangeEnd"] = ipAssignmentPool.IPRangeEnd
                });
            }

            config["ipAssignmentPools"] = configIpAssignmentPools;
        }

        if (routes != null)
        {
            var configRoutes = new JsonArray();
            foreach (var route in routes)
            {
                configRoutes.Add(new JsonObject
                {
                    ["target"] = route.Target,
                    ["via"] = route.Via
                });
            }

            config["routes"] = configRoutes;
        }

        var networkDefinition = new JsonObject
        {
            ["config"] = config
        };

        var response = await httpClient.PostAsJsonAsync($"api/network/{networkId}", networkDefinition, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTNetwork>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to update ZeroTier Network.");
    }

    public async Task<ZTMember> SetNetworkMemberAuthorizationAsync(string networkId, string memberId, bool authorized, CancellationToken cancellationToken = default)
    {
        var content = new JsonObject
        {
            ["config"] = new JsonObject
            {
                ["authorized"] = authorized
            }
        };
        var response = await httpClient.PostAsJsonAsync($"api/network/{networkId}/member/{memberId}", content, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTMember>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to set authorization of ZeroTier Controller Network {networkId} member {memberId}.");
    }

    public async Task<ZTMember> SetNetworkMemberNameAsync(string networkId, string memberId, string name, CancellationToken cancellationToken = default)
    {
        var content = new JsonObject
        {
            ["name"] = name
        };
        var response = await httpClient.PostAsJsonAsync($"api/network/{networkId}/member/{memberId}", content, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTMember>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to set Name of ZeroTier Controller Network {networkId} member {memberId}.");
    }

    public async Task<ZTMember> SetNetworkMemberDescriptionAsync(string networkId, string memberId, string description, CancellationToken cancellationToken = default)
    {
        var content = new JsonObject
        {
            ["description"] = description
        };
        var response = await httpClient.PostAsJsonAsync($"api/network/{networkId}/member/{memberId}", content, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTMember>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to set Name of ZeroTier Controller Network {networkId} member {memberId}.");
    }

    public async Task<ZTMember> SetNetworkMemberIpAssignmentsAsync(string networkId, string memberId, IPAddress[] iPAddresses, CancellationToken cancellationToken = default)
    {
        var value = string.Join(",", iPAddresses.Select(x => x.ToString()));
        var content = new JsonObject
        {
            ["ipAssignments"] = new JsonArray(iPAddresses.Select(x => JsonValue.Create(x.ToString())).ToArray())
        };
        var response = await httpClient.PostAsJsonAsync($"api/network/{networkId}/member/{memberId}", content, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<ZTMember>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to set IP Address Assginment of ZeroTier Controller Network {networkId} member {memberId} with values '{string.Join(",", value)}'.");
    }

    public async Task DeleteNetworkMemberAsync(string networkId, string memberId, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.DeleteAsync($"api/network/{networkId}/member/{memberId}", cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<ZTNodeConfig> GetNodeStatusAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, CancellationToken cancellationToken = default)
    {
        //var mdcEndpointService = serviceCollection.GetRequiredService<IMDCEndpointService>();
        //var mdcEndpoint = await mdcEndpointService.GetMicroDataCenterSiteAsync(datacenterEntry.SiteName, cancellationToken);
        var result = await datacenterEntry.PVEClient.QemuAgentExecAsync(node, vmid, $"zerotier-cli info -j");

        if (result.ExitCode != 0)
        {
            throw new ApplicationException($"QEMU agent command '{result.Command}' for VMID '{vmid}' on node '{node}' failed with exit code {result.ExitCode}: {result.ErrorMessage}");
        }

        // Return the result as a ZTStatus object
        return JsonSerializer.Deserialize<ZTNodeConfig>(result.Output ?? string.Empty, System.Text.Json.JsonSerializerOptions.Web) ?? throw new InvalidOperationException($"Unable to get ZeroTier status from VM {vmid} on node {node}.");
    }

    public async Task<string> InstallZeroTierAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, CancellationToken cancellationToken = default)
    {
        var aptGetUpdateResponse = await datacenterEntry.PVEClient.QemuAgentExecAsync(node, vmid, "apt-get update", cancellationToken);

        var result = await datacenterEntry.PVEClient.QemuAgentExecAsync(node, vmid, "curl -s https://install.zerotier.com | sudo bash", cancellationToken);
        if (result.ExitCode != 0)
        {
            throw new ApplicationException($"QEMU agent command '{result.Command}' for VMID '{vmid}' on node '{node}' failed with exit code {result.ExitCode}: {result.ErrorMessage}");
        }
        return result.Output ?? string.Empty;
    }

    public async Task<ZTNetworkMembership> JoinNetworkAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, string networkId, string memberName, IPAddress[] ipAddresses, DatacenterSettings datacenterSettings, CancellationToken cancellationToken = default)
    {
        var result = await datacenterEntry.PVEClient.QemuAgentExecAsync(node, vmid, $"zerotier-cli join {networkId} -j");
        if (result.ExitCode != 0)
        {
            throw new ApplicationException($"QEMU agent command '{result.Command}' for VMID '{vmid}' on node '{node}' failed with exit code {result.ExitCode}: {result.ErrorMessage}");
        }
        var joinNetworkMembership = JsonSerializer.Deserialize<ZTNetworkMembership>(result.Output ?? string.Empty, System.Text.Json.JsonSerializerOptions.Web) ?? throw new InvalidOperationException($"Unable to Join ZeroTier Node from VM {vmid} on node {node} to network {networkId}.");

        var nodeConfig = await GetNodeStatusAsync(datacenterEntry, node, vmid, cancellationToken);

        var controllerNetworkMember = await GetNetworkMemberByIdAsync(networkId, nodeConfig.Address, true, datacenterSettings, cancellationToken);

        if (ipAddresses.Length > 0)
        {
            var updatedControllerNetworkMember = await SetNetworkMemberIpAssignmentsAsync(networkId, nodeConfig.Address, ipAddresses, cancellationToken);
        }

        {
            var updatedControllerNetworkMember = await SetNetworkMemberNameAsync(networkId, nodeConfig.Address, memberName, cancellationToken);
        }

        var network = await GetNetworkByIdAsync(networkId, cancellationToken);

        if (network?.Config.Private == true)
        {
            var updatedControllerNetworkMember = await SetNetworkMemberAuthorizationAsync(networkId, nodeConfig.Address, true, cancellationToken);
        }

        return await WaitForNodeIPAddressAsync(datacenterEntry, node, vmid, networkId, datacenterSettings, cancellationToken);
    }

    public async Task<ZTNetworkMembership[]> GetNetworkMembershipAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, CancellationToken cancellationToken = default)
    {
        var result = await datacenterEntry.PVEClient.QemuAgentExecAsync(node, vmid, "zerotier-cli listnetworks -j", cancellationToken);
        if (result.ExitCode != 0)
        {
            throw new ApplicationException($"QEMU agent command '{result.Command}' for VMID '{vmid}' on node '{node}' failed with exit code {result.ExitCode}: {result.ErrorMessage}");
        }
        return JsonSerializer.Deserialize<ZTNetworkMembership[]>(result.Output ?? string.Empty, System.Text.Json.JsonSerializerOptions.Web) ?? throw new InvalidOperationException($"Unable to list ZeroTier Networks from VM {vmid} on node {node}.");
    }

    public async Task<ZTNetworkMembership?> GetNetworkMembershipAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, string networkId, CancellationToken cancellationToken = default)
    {
        return (await GetNetworkMembershipAsync(datacenterEntry, node, vmid, cancellationToken)).FirstOrDefault(x => x.Id == networkId);
    }

    private async Task<ZTNetworkMembership> WaitForNodeIPAddressAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, string networkId, DatacenterSettings datacenterSettings, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        do
        {
            var network = await GetNetworkMembershipAsync(datacenterEntry, node, vmid, networkId, cancellationToken);

            if (network != null && network.AssignedAddresses != null && network.AssignedAddresses.Length > 0)
            {
                return network;
            }

            if (stopwatch.Elapsed.TotalSeconds > datacenterSettings.WaitForZeroTierMembershipRequestTimeoutSeconds)
                throw new TimeoutException($"Waiting for ZeroTeir IP Addresss assignment for VM {vmid} on node {node} to network '{networkId}' timed out after {datacenterSettings.WaitForZeroTierMembershipRequestTimeoutSeconds} seconds.");

            await Task.Delay(datacenterSettings.WaitForZeroTierMembershipRequestPollingDelayMilliseconds, cancellationToken);
        } while (true);
    }

    public async Task<ZTMember> WaitForMemberIPAssignmentAsync(string networkId, string memberId, CancellationToken cancellationToken = default)
    {
        var waitForZeroTierMembershipRequestTimeoutSeconds = 30;
        var waitForZeroTierMembershipRequestPollingDelayMilliseconds = 2000;

        var stopwatch = Stopwatch.StartNew();
        do
        {
            var member = await GetNetworkMemberByIdAsync(networkId, memberId, false, null, cancellationToken) ?? throw new InvalidOperationException($"Unable to get details of Network member {memberId}.");
            
            if (member.Config.IPAssignments != null && member.Config.IPAssignments.Length > 0)
            {
                return member;
            }

            if (stopwatch.Elapsed.TotalSeconds > waitForZeroTierMembershipRequestTimeoutSeconds)
                throw new TimeoutException($"Waiting for Network member '{memberId}' IP Assignment timed out after {waitForZeroTierMembershipRequestTimeoutSeconds} seconds.");

            await Task.Delay(waitForZeroTierMembershipRequestPollingDelayMilliseconds, cancellationToken);
        } while (true);
    }

    public async Task<ZTMember> WaitForMemberOnlineAsync(string networkId, string memberId, CancellationToken cancellationToken = default)
    {
        var waitForZeroTierMembershipRequestTimeoutSeconds = 180;
        var waitForZeroTierMembershipRequestPollingDelayMilliseconds = 2000;

        var stopwatch = Stopwatch.StartNew();
        do
        {
            var member = await GetNetworkMemberByIdAsync(networkId, memberId, false, null, cancellationToken) ?? throw new InvalidOperationException($"Unable to get details of Network member {memberId}.");

            if (member.Online == 1)
            {
                return member;
            }

            if (stopwatch.Elapsed.TotalSeconds > waitForZeroTierMembershipRequestTimeoutSeconds)
                throw new TimeoutException($"Waiting for Network member '{memberId}' Online {waitForZeroTierMembershipRequestTimeoutSeconds} seconds.");

            await Task.Delay(waitForZeroTierMembershipRequestPollingDelayMilliseconds, cancellationToken);
        } while (true);
    }
}