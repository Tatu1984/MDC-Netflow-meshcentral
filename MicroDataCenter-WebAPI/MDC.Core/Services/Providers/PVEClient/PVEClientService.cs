using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEClientService(HttpClient httpClient, ILogger<PVEClientService> logger) : IPVEClientService
{
    public Guid _instance = Guid.NewGuid();
    public Guid Instance => _instance;

    public async Task<PVEClusterStatus[]> GetClusterStatusAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetClusterStatusAsync");
        var response = await httpClient.GetAsync("cluster/status", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVEClusterStatus[]>>(cancellationToken))?.Data ?? [];
    }

    public async Task<PVENodeStatus> GetNodeStatusAsync(string node, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetNodeStatusAsync({node})", node);
        var response = await httpClient.GetAsync($"nodes/{node}/status", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVENodeStatus>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to get status for node '{node}'.");
    }

    public async Task<(PVENodeNetwork[] nodeNetworks,string? changes)> GetNodeNetworkAsync(string node, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetNodeNetworkAsync({node})", node);
        var response = await httpClient.GetAsync($"nodes/{node}/network", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var pveResponse = await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVENodeNetwork[]>>(cancellationToken);
        if (pveResponse?.Data == null) throw new InvalidOperationException($"Unable to get network for node '{node}'.");
        return (pveResponse.Data, pveResponse.Changes);
    }

    public async Task<JsonNode> CreateNodeNetworkAsync(string node, PVENodeNetwork nodeNetwork, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("CreateNodeNetworkAsync({node}, {nodeNetwork})", node, nodeNetwork);
        var values = new Dictionary<string, string>()
        {
            { "type", nodeNetwork.NetworkInterfaceType },
            { "iface", nodeNetwork.NetworkInterfaceName }
        };

        if (nodeNetwork.Autostart != null)
            values.Add("autostart", nodeNetwork.Autostart.Value.ToString());
        if (nodeNetwork.BridgePorts != null)
            values.Add("bridge_ports", nodeNetwork.BridgePorts);
        if (nodeNetwork.Comments != null)
            values.Add("comments", nodeNetwork.Comments);
        if (nodeNetwork.BridgeVLANAware != null)
            values.Add("bridge_vlan_aware", nodeNetwork.BridgeVLANAware.Value.ToString());

        using var content = new FormUrlEncodedContent(values);

        var response = await httpClient.PostAsync($"nodes/{node}/network", content, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<JsonNode>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to create network for node '{node}'.");
    }

    public async Task<JsonNode> UpdateNodeNetworkAsync(string node, PVENodeNetwork nodeNetwork, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("UpdateNodeNetworkAsync({node}, {nodeNetwork})", node, nodeNetwork);
        var values = new List<KeyValuePair<string, string>>()
        {
            new KeyValuePair<string,string>("type", nodeNetwork.NetworkInterfaceType),
            new KeyValuePair<string,string>("delete", "cidr6"),
            new KeyValuePair<string,string>("delete", "gateway6"),
            new KeyValuePair<string,string>("delete", "mtu")
        };

        if (nodeNetwork.Autostart != null)
            values.Add(new KeyValuePair<string, string>("autostart", nodeNetwork.Autostart.Value.ToString()));
        if (nodeNetwork.BridgePorts != null)
            values.Add(new KeyValuePair<string, string>("bridge_ports", nodeNetwork.BridgePorts));
        if (nodeNetwork.Comments != null)
            values.Add(new KeyValuePair<string, string>("comments", nodeNetwork.Comments));
        if (nodeNetwork.BridgeVLANAware != null)
            values.Add(new KeyValuePair<string, string>("bridge_vlan_aware", nodeNetwork.BridgeVLANAware.Value.ToString()));
        if (nodeNetwork.CIDR != null)
            values.Add(new KeyValuePair<string, string>("cidr", nodeNetwork.CIDR));
        if (nodeNetwork.Gateway != null)
            values.Add(new KeyValuePair<string, string>("gateway", nodeNetwork.Gateway));

        using var content = new FormUrlEncodedContent(values);

        var response = await httpClient.PutAsync($"nodes/{node}/network/{nodeNetwork.NetworkInterfaceName}", content, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<JsonNode>(cancellationToken)) ?? throw new InvalidOperationException($"Unable to create network for node '{node}'.");
    }

    public async Task ApplyNodeNetworkChangesAsync(string node, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("ApplyNodeNetworkChangesAsync({node})", node);
        var response = await httpClient.PutAsync($"nodes/{node}/network", null, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var upid = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<string>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to apply network changes for node '{node}'.");

        // Wait for Task to complete
        var taskStatus = await WaitForTaskAsync(node, upid, cancellationToken);
        if (taskStatus.ExitStatus != "OK") throw new ApplicationException($"Apply Node Network Changes Task '{upid}' failed with error '{taskStatus?.ExitStatus}'");
    }

    public async Task<IEnumerable<PVEResource>> GetClusterResourcesAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetClusterResourcesAsync");
        var response = await httpClient.GetAsync("cluster/resources", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<IEnumerable<PVEResource>>>(cancellationToken))?.Data ?? [];
    }

    public async Task<PVEQemuConfig?> GetQemuConfigAsync(string node, int vmid, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetQemuConfigAsync({node},{vmid})", node, vmid);
        var response = await httpClient.GetAsync($"nodes/{node}/qemu/{vmid}/config", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVEQemuConfig>> (cancellationToken))?.Data;
    }

    public async Task UpdateQemuConfigAsync(string node, int vmid, PVEQemuConfig? config, IEnumerable<PVEQemuConfigNetworkAdapter> networkAdapters, IEnumerable<string> deleteProperties, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("UpdateQemuConfigAsync({node},{vmid},{config},{networkAdapters},{deleteProperties})", node, vmid, config, networkAdapters, deleteProperties);
        var values = new Dictionary<string, string>();  
        if (config?.Name != null)
            values.Add("name", config.Name);
        if (config?.Cores != null)
            values.Add("cores", config.Cores.Value.ToString());
        if (config?.Memory != null)
            values.Add("memory", config.Memory);
        if (config?.OnBoot != null)
            values.Add("onboot", config.OnBoot.Value.ToString());

        if (config != null)
        {
            foreach (var entry in config.UnknownProperties.Where(entry => entry.Value.ValueKind == System.Text.Json.JsonValueKind.String))
            {
                values.Add(entry.Key, entry.Value.GetString() ?? string.Empty);
            }
        }

        //if (config?.Tags != null)
        //    values.Add("tags", config.Tags);

        foreach (var networkAdapter in networkAdapters)
            values.Add(networkAdapter.DeviceId, networkAdapter.ToConfigValue());

        deleteProperties = deleteProperties.Concat(["balloon"]);
        // if (deleteProperties.Any())
        values.Add("delete", string.Join(",", deleteProperties));

        using var content = new FormUrlEncodedContent(values);

        using var response = await httpClient.PutAsync($"nodes/{node}/qemu/{vmid}/config", content, cancellationToken); // NOTE: PUT is syncronouse, POST is asyncronouse - https://pve.proxmox.com/pve-docs/api-viewer/#/nodes/{node}/qemu/{vmid}/config
        // using var response = await httpClient.PostAsync($"nodes/{node}/qemu/{vmid}/config", content, cancellationToken);
        try
        {
            using var responseMessage = response.EnsureSuccessStatusCode();
            var result = (await responseMessage.Content.ReadFromJsonAsync<JsonNode>(cancellationToken));
        }
        catch (HttpRequestException ex) // when (ex.Message.Contains("500 (Internal Server Error)") && response.Content != null)
        {
            // Proxmox returns a 500 error if the configuration is invalid, so we need to parse the error message
            var errorMessage = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError(ex, "Unable to Update VM Config VMID '{vmid}' on Node '{node}'.", vmid, node);

            throw new ApplicationException($"Unable to Update VM Config VMID '{vmid}' on Node '{node}': {errorMessage}", ex);
        }
    }

    private static readonly SemaphoreSlim _asyncLock_CreateQemuCloneAsync = new SemaphoreSlim(1, 1);
    public async Task<(int vmid, string upid)> CreateQemuCloneAsync(string templateNode, int templateVmId, string name, string targetNode, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("CreateQemuCloneAsync({templateNode},{templateVmId},{name},{targetNode})", templateNode, templateVmId, name, targetNode);

        // lock this section so that multiple threads do not get the same "newid" from GetNextIdAsync
        await _asyncLock_CreateQemuCloneAsync.WaitAsync(cancellationToken);
        try
        {
            int newid = await GetNextIdAsync(cancellationToken);

            var values = new Dictionary<string, string>
            {
                { "newid", newid.ToString() },
                { "name", name },
                { "target", targetNode}
            };
            using var content = new FormUrlEncodedContent(values);

            using var response = await httpClient.PostAsync($"nodes/{templateNode}/qemu/{templateVmId}/clone", content, cancellationToken);

            using var responseMessage = response.EnsureSuccessStatusCode();
            var upid = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<string>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to Clone VM Template VMID '{templateVmId}' from Node '{templateNode}' to VMID '{newid}' on node '{targetNode}' using VM Name '{name}'.");
            return (newid, upid);
        }
        finally
        {
            _asyncLock_CreateQemuCloneAsync.Release();
        }
    }

    public async Task<string> CreateQemuAsync(string node, int vmid, bool unique, string storage, string archive, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("CreateQemuAsync({node},{vmid},{unique},{storage},{archive})", node, vmid, unique, storage, archive);

        var values = new Dictionary<string, string>
            {
                { "vmid", vmid.ToString() },
                { "force", "0" },
                { "unique", unique ? "1" : "0" },
                { "storage", storage },
                { "archive", archive }
            };
        using var content = new FormUrlEncodedContent(values);

        using var response = await httpClient.PostAsync($"nodes/{node}/qemu", content, cancellationToken);

        using var responseMessage = response.EnsureSuccessStatusCode();
        var upid = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<string>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to Create VM VMID '{vmid}' on Node '{node}' to storage '{storage}' using archive '{archive}'.");
        return upid;
    }

    public async Task<PVETask[]> GetTasksAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetTasksAsync");

        var response = await httpClient.GetAsync($"cluster/tasks", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVETask[]>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to get tasks."); ;
    }

    public async Task<string> DeleteQemuAsync(string node, int vmid, bool? purgeFromJobConfigurations = false, bool? destroyUnreferencedDisks = false, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("DeleteQemuAsync({node},{vmid},{purgeFromJobConfigurations},{destroyUnreferencedDisks})", node, vmid, purgeFromJobConfigurations, destroyUnreferencedDisks);

        List<string> parameters = new List<string>();
        if (purgeFromJobConfigurations == true) parameters.Add("purge=1");
        if (destroyUnreferencedDisks == true) parameters.Add("destroy-unreferenced-disks=1");

        var response = await httpClient.DeleteAsync($"nodes/{node}/qemu/{vmid}{(parameters.Count > 0 ? $"?{string.Join('&', parameters)}" : string.Empty)}", cancellationToken);

        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<string>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to Delete VM VMID '{vmid}' from Node '{node}'.");
    }

    public async Task<(string upid, PVEQemuStatus? qemuStatus, PVEQemuAgentNetworkInterface[]? networkInterfaces)> QemuStatusStartAsync(string node, int vmid, QemuWaitOptions waitOption, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("QemuStatusStartAsync({node},{vmid},{waitOption})", node, vmid, waitOption);

        var values = new Dictionary<string, string>();
        using var content = new FormUrlEncodedContent(values);

        using var response = await httpClient.PostAsync($"nodes/{node}/qemu/{vmid}/status/start", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var upid = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<string>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to Start VM VMID '{vmid}' on Node '{node}'.");

        if (waitOption == QemuWaitOptions.None)
            return (upid, null, null);

        // Wait for Task to complete
        var taskStatus = await WaitForTaskAsync(node, upid, cancellationToken);
        if (taskStatus.ExitStatus != "OK") throw new ApplicationException($"Start Task '{upid}' failed with error '{taskStatus?.ExitStatus}'");

        // Set Start OnBoot to true if the VM started successfully to ensure it starts again after host reboot
        await UpdateQemuConfigAsync(node, vmid, new PVEQemuConfig { OnBoot = 1 }, [], [], cancellationToken);

        if (waitOption == QemuWaitOptions.WaitForTask)
            return (upid, null, null);

        // Wait for VM to be in running state
        PVEQemuStatus currentStatus = await QemuStatusWaitForStateAsync(node, vmid, "running", cancellationToken);
        if (waitOption == QemuWaitOptions.WaitForState || currentStatus.Agent != 1)
            return (upid, currentStatus, null);

        // Wait for Agent to be available
        var ping = await QemuStatusWaitForAgentAsync(node, vmid, cancellationToken);
        if (waitOption == QemuWaitOptions.WaitForAgent)
        {
            return (upid, currentStatus, null);
        }

        // Wait for IP Address
        if (waitOption == QemuWaitOptions.WaitForIPAddress)
        {
            var networkInterfaces = await QemuStatusWaitForAgentIPAddressAsync(node, vmid, cancellationToken);
            return (upid, currentStatus, networkInterfaces);
        }
        throw new InvalidOperationException($"Invalid wait option '{waitOption}' specified.");
    }

    public async Task<string> QemuStatusStopAsync(string node, int vmid, bool? overruleShutdown, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("QemuStatusStopAsync({node},{vmid},{overruleShutdown})", node, vmid, overruleShutdown);

        var values = new Dictionary<string, string>();
        if (overruleShutdown.HasValue)
            values.Add("overrule-shutdown", overruleShutdown.Value ? "0" : "1");
        using var content = new FormUrlEncodedContent(values);

        using var response = await httpClient.PostAsync($"nodes/{node}/qemu/{vmid}/status/stop", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var upid = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<string>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to Start VM VMID '{vmid}' on Node '{node}'.");
        return upid;
    }

    public async Task<PVEClusterOptions> GetClusterOptionsAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetClusterOptionsAsync");

        var response = await httpClient.GetAsync("cluster/options", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVEClusterOptions>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get Cluster Options.");
    }

    public async Task<PVEQemuStatus> GetQemuStatusCurrentAsync(string node, int vmid, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetQemuStatusCurrentAsync({node},{vmid})", node, vmid);

        var response = await httpClient.GetAsync($"nodes/{node}/qemu/{vmid}/status/current", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVEQemuStatus>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to get current status for VMID '{vmid}' on node '{node}'.");
    }

    public async Task<bool> QemuAgentPingAsync(string node, int vmid, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("QemuAgentPingAsync({node},{vmid})", node, vmid);

        var response = await httpClient.PostAsync($"nodes/{node}/qemu/{vmid}/agent/ping", null, cancellationToken);
        if (response.StatusCode == System.Net.HttpStatusCode.InternalServerError && response.ReasonPhrase == "QEMU guest agent is not running")
        {
            // Agent is not available
            return false;
        }
        var responseMessage = response.EnsureSuccessStatusCode();
        var result = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonNode>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to ping QEMU agent for VMID '{vmid}' on node '{node}'.");
        return result["result"]?.AsObject().Count == 0; // .GetValue<string>() == "OK";
    }

    public async Task<PVEQemuAgentNetworkInterface[]?> QemuAgentGetNetworkInterfacesAsync(string node, int vmid, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("QemuAgentGetNetworkInterfacesAsync({node},{vmid})", node, vmid);

        var response = await httpClient.GetAsync($"nodes/{node}/qemu/{vmid}/agent/network-get-interfaces", cancellationToken);
        if (response.StatusCode == HttpStatusCode.InternalServerError && response.ReasonPhrase == "QEMU guest agent is not running")
            return null;
        var responseMessage = response.EnsureSuccessStatusCode();
        var networkInterfaces = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonNode>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to get QEMU agent network interfaces for VMID '{vmid}' on node '{node}'.");

        return networkInterfaces["result"]?.AsArray().SelectMany(ni => ni?["ip-addresses"]?.AsArray() ?? [], (ni, ip) => new PVEQemuAgentNetworkInterface
            {
                Name = ni?["name"]?.GetValue<string>() ?? string.Empty,
                MACAddress = ni?["hardware-address"]?.GetValue<string>() ?? string.Empty,
                IPAddress = IPAddress.TryParse(ip?["ip-address"]?.GetValue<string>(), out var address) ? address : null,
                Prefix = ip?["prefix"]?.GetValue<int>()
            })
            .ToArray() ?? [];
    }

    public async Task<QemuAgentExecResult> QemuAgentExecAsync(string node, int vmid, string command, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("QemuAgentExecAsync({node},{vmid},{command})", node, vmid, command);

        var values = new Dictionary<string, string[]>
        {
            { "command", ["/bin/sh", "-c", command] }
        };
        using var content = new StringContent(JsonSerializer.Serialize(values), Encoding.UTF8, "application/json");
        using var response = await httpClient.PostAsync($"nodes/{node}/qemu/{vmid}/agent/exec", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var pid = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonNode>>(cancellationToken))?.Data?["pid"]?.GetValue<int>() ?? throw new InvalidOperationException($"Unable to execute QEMU agent command '{command}' for VMID '{vmid}' on node '{node}'.");

        // Get the Exec Status
        var datacenterSettings = await GetDatacenterSettingsAsync(cancellationToken);
        var stopwatch = Stopwatch.StartNew();
        do
        {
            // await Task.Delay(500, cancellationToken); // Wait a bit before checking the status
            using var statusResponse = await httpClient.GetAsync($"nodes/{node}/qemu/{vmid}/agent/exec-status?pid={pid}", cancellationToken);
            using var statusResponseMessage = statusResponse.EnsureSuccessStatusCode();
            var execStatus = (await statusResponseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonNode>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to get exec status for QEMU agent command '{command}' with PID '{pid}' for VMID '{vmid}' on node '{node}'.");
            var exited = execStatus["exited"]?.GetValue<int>() == 1;
            if (exited)
            {
                stopwatch.Stop();
                var exitcode = execStatus["exitcode"]?.GetValue<int>() ?? -1;
                if (exitcode != 0)
                {
                    var errorMessage = execStatus["error"]?.GetValue<string>() ?? "Unknown error";
                    logger.LogError("QEMU agent command '{command}' for VMID '{vmid}' on node '{node}' failed after '{elapsed}' with exit code {exitcode}: {error}.", command, vmid, node, stopwatch.Elapsed, exitcode, errorMessage);
                    // throw new ApplicationException($"QEMU agent command '{command}' for VMID '{vmid}' on node '{node}' failed with exit code {exitcode}: {error}");
                }
                return new QemuAgentExecResult
                {
                    Command = command,
                    Output = execStatus["out-data"]?.GetValue<string>(),
                    ExitCode = exitcode,
                    ErrorMessage = execStatus["error"]?.GetValue<string>(),
                    Elapsed = stopwatch.Elapsed
                };
            }

            if (stopwatch.Elapsed.TotalSeconds > datacenterSettings.WaitForQemuAgentExecTimeoutSeconds)
                throw new TimeoutException($"Waiting for VMID '{vmid}' IP Address timed out after {datacenterSettings.WaitForQemuAgentExecTimeoutSeconds} seconds.");
            await Task.Delay(datacenterSettings.WaitForQemuAgentExecPollingDelayMilliseconds, cancellationToken);
        } while (true);
    }

    public async Task<PVETaskStatus> WaitForTaskAsync(string node, string upid, CancellationToken cancellationToken = default)
    {
        var datacenterSettings = await GetDatacenterSettingsAsync(cancellationToken);
        var stopwatch = Stopwatch.StartNew();
        do
        {
            try
            {
                var taskStatus = await GetTaskStatusAsync(node, upid, cancellationToken);

                if (taskStatus?.Status == PVETaskStatusType.Stopped)
                {
                    if (taskStatus?.ExitStatus != "OK") throw new ApplicationException($"Task '{upid}' failed with error '{taskStatus?.ExitStatus}'");
                    return taskStatus;
                }
            }
            catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.BadRequest && ex.Message == "Response status code does not indicate success: 400 (Parameter verification failed.).")
            {
                // Task not found, continue polling
            }

            if (stopwatch.Elapsed.TotalSeconds > datacenterSettings.WaitForTaskTimeoutSeconds)
            {
                logger.LogError("Task {upid} timed out after {WaitForTaskTimeoutSeconds} seconds.", upid, datacenterSettings.WaitForTaskTimeoutSeconds);
                throw new TimeoutException($"Task '{upid}' timed out after {datacenterSettings.WaitForTaskTimeoutSeconds} seconds.");
            }

            await Task.Delay(datacenterSettings.WaitForTaskPollingDelayMilliseconds, cancellationToken);
        } while (true);
    }

    public async Task<PVEQemuStatus> QemuStatusWaitForStateAsync(string node, int vmid, string state, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("QemuStatusWaitForStateAsync({node},{vmid},{state})", node, vmid, state);

        // Supported states are: "shutdown", "running", "paused", "suspended", "stopped".   See https://qemu.weilnetz.de/doc/2.11/qemu-qmp-ref.pdf section 1.5 VM run state
        var datacenterSettings = await GetDatacenterSettingsAsync(cancellationToken);
        var stopwatch = Stopwatch.StartNew();
        do
        {
            var currentStatus = await GetQemuStatusCurrentAsync(node, vmid, cancellationToken);
            if (currentStatus.Qmpstatus == state)
                return currentStatus;
            if (stopwatch.Elapsed.TotalSeconds > datacenterSettings.WaitForQemuStatusTimeoutSeconds)
                throw new TimeoutException($"Waiting for VMID '{vmid}' to reach '{state}' state timed out after {datacenterSettings.WaitForQemuStatusTimeoutSeconds} seconds.");
            await Task.Delay(datacenterSettings.WaitForQemuStatusPollingDelayMilliseconds, cancellationToken);
        } while (true);
    }

    public async Task<JsonArray> GetStorageAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetStorageAsync");

        var response = await httpClient.GetAsync("storage", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var responseData = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonArray>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get storage.");
        return responseData;
    }

    public async Task<PVEStorageContent[]> GetStorageContentAsync(string node, string storageId, string? contentType = default, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetStorageContentAsync({node},{storageId},{contentType})", node, storageId, contentType);

        var uri = $"nodes/{node}/storage/{storageId}/content";
        if (contentType != null)
            uri += $"?content={contentType}";
        var response = await httpClient.GetAsync(uri, cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var responseData = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVEStorageContent[]>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get storage.");
        return responseData;
    }

    public async Task<string> StorageExtractConfigAsync(string node, string volumeId, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("StorageExtractConfigAsync({node},{volumeId})", node, volumeId);

        var response = await httpClient.GetAsync($"nodes/{node}/vzdump/extractconfig?volume={volumeId}", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var responseData = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<string>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to extract volume config.");
        return responseData;
    }

    public async Task<JsonNode> CreateStorageAsync(string storageId, string server, string datastore, string @namespace, string username, string password, string? fingerprint = default, string content = "backup", string type = "pbs", string? nodes = default, int disable = 0, string pruneBackups = "keep-all=1", CancellationToken cancellationToken = default)
    {
        logger.LogInformation("CreateStorageAsync({storageId},{server},{datastore},{@namespace},{username},{fingerprint},{content},{type})", storageId, server, datastore, @namespace,username, fingerprint, content, type);

        var values = new Dictionary<string, string?>
        {
            { "storage", storageId },
            { "server", server },
            { "username", username },
            { "password", password },
            { "nodes", nodes },
            { "content", content },
            { "datastore", datastore },
            { "namespace", @namespace },
            { "fingerprint", fingerprint },
            { "type", type },
            { "disable", disable.ToString() },
            { "prune-backups", pruneBackups }
        };
        using var formContent = new FormUrlEncodedContent(values);
        using var response = await httpClient.PostAsync("storage", formContent, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var responseData = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to create storeage.");
        return responseData;
    }

    public async Task DeleteStorageAsync(string storageId, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("DeleteStorageAsync({storageId}", storageId);

        using var response = await httpClient.DeleteAsync($"storage/{storageId}", cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        _ = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to delete storage.");
    }

    #region Access
    public async Task<JsonObject> GetAccessPermissionsAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetAccessPermissionsAsync");

        var response = await httpClient.GetAsync($"access/permissions", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonObject>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get permissions.");
    }

    public async Task<JsonArray> GetRolesAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetRolesAsync");

        var response = await httpClient.GetAsync("access/roles", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var responseData = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonArray>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get roles.");
        return responseData;
    }

    public async Task<JsonObject> GetRoleAsync(string roleId, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetRoleAsync({roleId})", roleId);

        var response = await httpClient.GetAsync($"access/roles/{roleId}", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonObject>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get role.");
    }

    public async Task<bool> CreateRoleAsync(string name, string[] privileges, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("CreateRoleAsync({name},{privileges})", name, privileges);

        var values = new Dictionary<string, string>
        {
            { "roleid", name },
            { "privs", string.Join(",", privileges) }
        };
        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PostAsync("access/roles", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var roleResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to create role.");
        return true;
    }

    public async Task<bool> UpdateRoleAsync(string name, string[] privileges, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("UpdateRoleAsync({name},{privileges})", name, privileges);

        var values = new Dictionary<string, string>
        {
            { "privs", string.Join(",", privileges) }
        };
        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PutAsync($"access/roles/{name}", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var roleResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to create role.");
        return true;
    }

    public async Task<bool> DeleteRoleAsync(string name, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("DeleteRoleAsync({name})", name);

        using var response = await httpClient.DeleteAsync($"access/roles/{name}", cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var roleResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to delete role.");
        return true;
    }

    public async Task<JsonArray> GetGroupsAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetGroupsAsync");

        var response = await httpClient.GetAsync("access/groups", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var rolesResponse = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonArray>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get groups.");
        return rolesResponse;
    }

    public async Task<bool> CreateGroupAsync(string groupId, string comment, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("CreateGroupAsync({groupId},{comment})", groupId, comment);

        var values = new Dictionary<string, string>
        {
            { "groupid", groupId },
            { "comment", comment }
        };
        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PostAsync("access/groups", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var groupResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to create group.");
        return true;
    }

    public async Task<bool> UpdateGroupAsync(string groupId, string comment, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("UpdateGroupAsync({groupId},{comment})", groupId, comment);

        var values = new Dictionary<string, string>
        {
            { "comment", comment }
        };
        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PutAsync($"access/groups/{groupId}", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var groupResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to update group.");
        return true;
    }

    public async Task<bool> DeleteGroupAsync(string groupId, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("DeleteGroupAsync({groupId})", groupId);

        using var response = await httpClient.DeleteAsync($"access/groups/{groupId}", cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var groupResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to delete group.");
        return true;
    }

    public async Task<JsonArray> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetUsersAsync");

        var response = await httpClient.GetAsync("access/users", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var usersResponse = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonArray>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get users.");
        return usersResponse;
    }

    public async Task<JsonObject> GetUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetUserAsync({userId})", userId);

        var response = await httpClient.GetAsync($"access/users/{userId}", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonObject>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get user.");
    }

    public async Task<bool> CreateUserAsync(string userId, string password, IEnumerable<string> groups, string comment, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("CreateUserAsync({userId},{groups},{comment})", userId, groups, comment);

        var values = new Dictionary<string, string>
        {
            { "userid", userId},
            { "comment", comment },
            { "password", password},
            { "groups", string.Join(",", groups) },
        };
        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PostAsync("access/users", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var userResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to create user.");
        return true;
    }

    public async Task<bool> UpdateUserAsync(string userId, IEnumerable<string>? groups, string? comment, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("UpdateUserAsync({userId},{groups},{comment})", userId, groups, comment);

        var values = new Dictionary<string, string>()
        {
            { "append", "1"},
        };

        if (groups != null)
            values.Add("groups", string.Join(",", groups));

        if (comment != null)
            values.Add("comment", comment);

        if (values.Count == 1)  // Nothing to update
            return false;

        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PutAsync($"access/users/{userId}", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var userResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to update user.");
        return true;
    }

    public async Task<JsonObject> CreateUserAPITokenAsync(string userId, string tokenId, string? comment, bool? privilegeSeparation, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("CreateUserAPITokenAsync({userId},{tokenId},{comment},{privilegeSeparation})", userId, tokenId, comment, privilegeSeparation);

        var values = new Dictionary<string, string>()
        {
            { "expire", "0" }
        };
        if (comment != null)
            values.Add("comment", comment);
        if (privilegeSeparation.HasValue)
            values.Add("privsep", privilegeSeparation == true? "1" : "0");
        
        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PostAsync($"access/users/{userId}/token/{tokenId}", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonObject>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to create API token for user.");
    }

    public async Task<JsonArray> GetUserAPITokensAsync(string userId, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetUserAPITokensAsync({userId})", userId);

        var response = await httpClient.GetAsync($"access/users/{userId}/token", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var usersResponse = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonArray>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get user API tokens.");
        return usersResponse;
    }

    public async Task<bool> DeleteUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("DeleteUserAsync({userId})", userId);

        using var response = await httpClient.DeleteAsync($"access/users/{userId}", cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var groupResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to delete user.");
        return true;
    }

    public async Task<PVEPermission[]> GetAccessControlListAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetAccessControlListAsync");

        var response = await httpClient.GetAsync("access/acl", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        var rolesResponse = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVEPermission[]>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get access control list.");
        return rolesResponse;
    }

    public async Task<bool> UpdateAccessControlListAsync(string path, string[] roles, string[] groups, bool? propagate, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("UpdateAccessControlListAsync({path},{roles},{groups},{propagate})", path, roles, groups, propagate);

        var values = new Dictionary<string, string>
        {
            { "path" , path  },
            { "roles", string.Join(",", roles) },
            { "groups", string.Join(",", groups) }
        };

        if (propagate.HasValue)
        {
            values.Add("propagage", propagate.Value.ToString());
        }

        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PutAsync($"access/acl", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var aclResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to update access control list.");
        return true;
    }

    public async Task<bool> DeleteAccessControlListAsync(string path, string[] roles, string[] groups, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("DeleteAccessControlListAsync({path},{roles},{groups})", path, roles, groups);

        var values = new Dictionary<string, string>
        {
            { "path" , path  },
            { "roles", string.Join(",", roles) },
            { "groups", string.Join(",", groups) },
            { "delete", "1" }
        };
        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PutAsync($"access/acl", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        var aclResponse = (await responseMessage.Content.ReadFromJsonAsync<JsonObject>(cancellationToken)) ?? throw new InvalidOperationException("Unable to update access control list.");
        return true;
    }
    #endregion

    public async Task<PVEVNCProxy> CreateVNCProxyAsync(string node, int vmid, bool? generatePassword, CancellationToken cancellationToken)
    {
        logger.LogInformation("CreateVNCProxyAsync({node},{vmid},{generatePassword})", node, vmid, generatePassword);

        var values = new Dictionary<string, string>
        {
            { "websocket", "1" },
            { "generate-password", generatePassword == true? "1" : "0" }
        };
      
        using var content = new FormUrlEncodedContent(values);
        using var response = await httpClient.PostAsync($"nodes/{node}/qemu/{vmid}/vncproxy", content, cancellationToken);
        using var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVEVNCProxy>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable create VNC Proxy.");
    }

    public async Task<JsonNode> AuthenticateWithAccessTicketAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        var data = await CreateAccessTicketAsync(username, password, cancellationToken);

        httpClient.DefaultRequestHeaders.Authorization = null;

        // Extract the token ID and CSRFPreventionToken from the access ticket
        var tokenId = data?["ticket"]?.GetValue<string>() ?? throw new InvalidOperationException("Failed to retrieve ticket from PVE access ticket response.");
        var CSRFPreventionToken = data?["CSRFPreventionToken"]?.GetValue<string>() ?? throw new InvalidOperationException("Failed to retrieve CSRFPreventionToken from PVE access ticket response.");

        httpClient.DefaultRequestHeaders.Add("Cookie", $"PVEAuthCookie={tokenId}");
        httpClient.DefaultRequestHeaders.Add("CSRFPreventionToken", CSRFPreventionToken);

        return data;
    }

    //public static async Task<IPVEClientService> AuthenticateWithAccessTicketAsync(string username, string password, string ipAddress, int port, bool validateServerCertificate, int? timeout, string? proxyBaseUrl, CancellationToken cancellationToken = default)
    //{
    //    var urlBuilder = proxyBaseUrl == null ? new UriBuilder
    //    {
    //        Scheme = "https",
    //        Host = ipAddress,
    //        Port = port,
    //        Path = "/api2/json/"
    //    }
    //    : new UriBuilder(proxyBaseUrl.TrimEnd('/') + "/api2/json/");

    //    var handler = new HttpClientHandler();
    //    if (!validateServerCertificate)
    //    {
    //        handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true;
    //    }
    //    var httpClient = new HttpClient(handler);
    //    httpClient.BaseAddress = urlBuilder.Uri;
    //    if (proxyBaseUrl != null)
    //    {
    //        httpClient.DefaultRequestHeaders.Add("X-Proxmox-Host", ipAddress.ToString());
    //        httpClient.DefaultRequestHeaders.Add("X-Proxmox-Port", port.ToString());
    //    }
    //    httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    //    if (timeout.HasValue)
    //    {
    //        httpClient.Timeout = TimeSpan.FromSeconds(timeout.Value);
    //    }

    //    var pveClient =  new PVEClientService(httpClient);
    //    var data = await pveClient.CreateAccessTicketAsync(username, password, cancellationToken);

    //    // Extract the token ID and CSRFPreventionToken from the access ticket
    //    var tokenId = data?["ticket"]?.GetValue<string>() ?? throw new InvalidOperationException("Failed to retrieve ticket from PVE access ticket response.");
    //    var CSRFPreventionToken = data?["CSRFPreventionToken"]?.GetValue<string>() ?? throw new InvalidOperationException("Failed to retrieve CSRFPreventionToken from PVE access ticket response.");
        
    //    httpClient.DefaultRequestHeaders.Add("Cookie", $"PVEAuthCookie={tokenId}");
    //    httpClient.DefaultRequestHeaders.Add("CSRFPreventionToken", CSRFPreventionToken);
    //    return pveClient;
    //}

    #region Private Members
    private async Task<int> GetNextIdAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetNextIdAsync");

        var response = await httpClient.GetAsync($"cluster/nextid", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<int>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to get next free VMID.");
    }

    private async Task<PVETaskStatus> GetTaskStatusAsync(string node, string upid, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("GetTaskStatusAsync({node},{upid})", node, upid);

        var response = await httpClient.GetAsync($"nodes/{node}/tasks/{upid}/status", cancellationToken);
        var responseMessage = response.EnsureSuccessStatusCode();
        return (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<PVETaskStatus>>(cancellationToken))?.Data ?? throw new InvalidOperationException($"Unable to get status for task '{upid}'."); ;
    }

    private async Task<bool> QemuStatusWaitForAgentAsync(string node, int vmid, CancellationToken cancellationToken = default)
    {
        var datacenterSettings = await GetDatacenterSettingsAsync(cancellationToken);
        var stopwatch = Stopwatch.StartNew();
        do
        {
            var pingResult = await QemuAgentPingAsync(node, vmid, cancellationToken);
            if (pingResult)
            {
                return true;
            }
            if (stopwatch.Elapsed.TotalSeconds > datacenterSettings.WaitForQemuAgentTimeoutSeconds)
                throw new TimeoutException($"Waiting for VMID '{vmid}' agent timed out after {datacenterSettings.WaitForQemuAgentTimeoutSeconds} seconds.");
            await Task.Delay(datacenterSettings.WaitForQemuAgentPollingDelayMilliseconds, cancellationToken);
        } while (true);
    }

    private async Task<PVEQemuAgentNetworkInterface[]> QemuStatusWaitForAgentIPAddressAsync(string node, int vmid, CancellationToken cancellationToken = default)
    {
        var datacenterSettings = await GetDatacenterSettingsAsync(cancellationToken);
        var stopwatch = Stopwatch.StartNew();
        do
        {
            var networkInterfaces = await QemuAgentGetNetworkInterfacesAsync(node, vmid, cancellationToken);
            if (networkInterfaces != null && networkInterfaces.Any(ni => ni.IPAddress != null && ni.IPAddress.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork && !IPAddress.IsLoopback(ni.IPAddress)))
            {
                return networkInterfaces;
            }

            if (stopwatch.Elapsed.TotalSeconds > datacenterSettings.WaitForQemuAgentIPAddressTimeoutSeconds)
                throw new TimeoutException($"Waiting for VMID '{vmid}' IP Address timed out after {datacenterSettings.WaitForQemuAgentIPAddressTimeoutSeconds} seconds.");
            await Task.Delay(datacenterSettings.WaitForQemuAgentIPAddressPollingDelayMilliseconds, cancellationToken);
        } while (true);
    }

    public async Task<DatacenterSettings> GetDatacenterSettingsAsync(CancellationToken cancellationToken = default)
    {
        var clusterOptions = await GetClusterOptionsAsync(cancellationToken);

        DatacenterSettings? datacenterSettings = null;
        if (!string.IsNullOrWhiteSpace(clusterOptions.Description))
        {
            try
            {
                datacenterSettings = JsonSerializer.Deserialize<DatacenterSettings>(clusterOptions.Description, System.Text.Json.JsonSerializerOptions.Web);
            }
            catch (JsonException ex)
            {
                throw new ApplicationException("Unable to deserialize Datacenter Settings from Cluster Options Description.", ex);
            }
        }
        return datacenterSettings ?? new DatacenterSettings();
    }

    private async Task<JsonNode> CreateAccessTicketAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("CreateAccessTicketAsync({username})", username);

        int waitForGatewayTimeout = 30;
        int retryDelayMilliseonds = 1000;

        var values = new Dictionary<string, string>
        {
            { "username", username },
            { "password", password }
        };

        // Retry authenticating with access ticket method.  This is because the creating the access ticket authentication may happen quickly after a device has just booted up and PVE network stack may not be fully up the first time
        var stopwatch = Stopwatch.StartNew();
        do
        {
            try
            {
                using var content = new FormUrlEncodedContent(values);
                using var response = await httpClient.PostAsync("access/ticket", content, cancellationToken);
                using var responseMessage = response.EnsureSuccessStatusCode();
                var ticketResponse = (await responseMessage.Content.ReadFromJsonAsync<PVEResponse<JsonNode>>(cancellationToken))?.Data ?? throw new InvalidOperationException("Unable to create access ticket.");

                // Extract the token ID and CSRFPreventionToken from the access ticket
                var tokenId = ticketResponse?["ticket"]?.GetValue<string>() ?? throw new InvalidOperationException("Failed to retrieve ticket from PVE access ticket response.");
  //              var CSRFPreventionToken = ticketResponse?["CSRFPreventionToken"]?.GetValue<string>() ?? throw new InvalidOperationException("Failed to retrieve CSRFPreventionToken from PVE access ticket response.");

    //            httpClient.DefaultRequestHeaders.Add("Cookie", $"PVEAuthCookie={tokenId}");
      //          httpClient.DefaultRequestHeaders.Add("CSRFPreventionToken", CSRFPreventionToken);

                return ticketResponse;
            }
            catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.BadGateway)
            {
                // Networking to PVE API may not be fully up yet. Retry
                // logger.LogWarning(ex, $"Received Bad Gateway error when attempting to create access ticket. This may be due to the PVE API network stack not being fully up yet. ({stopwatch.Elapsed.TotalMilliseconds} of {waitForGatewayTimeout * 1000} ms) Retrying...");
            }
            catch (Exception ex)
            {
                throw new ApplicationException("Failed to create access ticket.", ex);
            }

            if (stopwatch.Elapsed.TotalSeconds > waitForGatewayTimeout)
                throw new TimeoutException($"Creating Access Ticket timed out after {waitForGatewayTimeout} seconds.");

            await Task.Delay(retryDelayMilliseonds, cancellationToken);
        } while (true);
    }
    #endregion
}
