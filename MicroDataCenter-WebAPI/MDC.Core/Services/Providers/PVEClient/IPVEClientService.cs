using System.Text.Json.Nodes;

namespace MDC.Core.Services.Providers.PVEClient;

internal enum QemuWaitOptions
{
    None = 0,
    WaitForTask = 1,
    WaitForState = 2,
    WaitForAgent = 3,
    WaitForIPAddress = 4
}

internal interface IPVEClientService
{
    Guid Instance { get; }

    Task<PVEClusterStatus[]> GetClusterStatusAsync(CancellationToken cancellationToken = default);

    Task<PVENodeStatus> GetNodeStatusAsync(string node, CancellationToken cancellationToken = default);

    Task<(PVENodeNetwork[] nodeNetworks, string? changes)> GetNodeNetworkAsync(string node, CancellationToken cancellationToken = default);

    Task<JsonNode> CreateNodeNetworkAsync(string node, PVENodeNetwork nodeNetwork, CancellationToken cancellationToken = default);

    Task<JsonNode> UpdateNodeNetworkAsync(string node, PVENodeNetwork nodeNetwork, CancellationToken cancellationToken = default);

    Task ApplyNodeNetworkChangesAsync(string node, CancellationToken cancellationToken = default);

    Task<IEnumerable<PVEResource>> GetClusterResourcesAsync(CancellationToken cancellationToken = default);

    Task<PVEQemuConfig?> GetQemuConfigAsync(string node, int vmId, CancellationToken cancellationToken = default);

    Task UpdateQemuConfigAsync(string node, int vmid, PVEQemuConfig? config, IEnumerable<PVEQemuConfigNetworkAdapter> networkAdapters, IEnumerable<string> deleteProperties, CancellationToken cancellationToken = default);

    Task<(int vmid, string upid)> CreateQemuCloneAsync(string templateNode, int templateVmId, string name, string targetNode, CancellationToken cancellationToken = default);

    Task<string> CreateQemuAsync(string node, int vmid, bool unique, string storage, string archive, CancellationToken cancellationToken = default);

    Task<PVETask[]> GetTasksAsync(CancellationToken cancellationToken = default);

    Task<string> DeleteQemuAsync(string node, int vmId, bool? purgeFromJobConfigurations = false, bool? destroyUnreferencedDisks = false, CancellationToken cancellationToken = default);

    Task<(string upid, PVEQemuStatus? qemuStatus, PVEQemuAgentNetworkInterface[]? networkInterfaces)> QemuStatusStartAsync(string node, int vmid, QemuWaitOptions waitOption, CancellationToken cancellationToken = default);

    Task<string> QemuStatusStopAsync(string node, int vmid, bool? overruleShutdown, CancellationToken cancellationToken = default);

    Task<PVEClusterOptions> GetClusterOptionsAsync(CancellationToken cancellationToken = default);

    Task<PVEQemuStatus> GetQemuStatusCurrentAsync(string node, int vmid, CancellationToken cancellationToken = default);

    Task<bool> QemuAgentPingAsync(string node, int vmid, CancellationToken cancellationToken = default);

    Task<PVEQemuAgentNetworkInterface[]?> QemuAgentGetNetworkInterfacesAsync(string node, int vmid, CancellationToken cancellationToken = default);

    Task<QemuAgentExecResult> QemuAgentExecAsync(string node, int vmid, string command, CancellationToken cancellationToken = default);

    Task<PVETaskStatus> WaitForTaskAsync(string node, string upid, CancellationToken cancellationToken = default);

    Task<PVEQemuStatus> QemuStatusWaitForStateAsync(string node, int vmid, string state, CancellationToken cancellationToken = default);

    Task<DatacenterSettings> GetDatacenterSettingsAsync(CancellationToken cancellationToken = default);

    Task<JsonNode> AuthenticateWithAccessTicketAsync(string username, string password, CancellationToken cancellationToken = default);

    #region Storage
    Task<JsonArray> GetStorageAsync(CancellationToken cancellationToken = default);

    Task<JsonNode> CreateStorageAsync(string storageId, string server, string datastore, string @namespace, string username, string password, string? fingerprint = default, string content = "backup", string type = "pbs", string? nodes = default, int disable = 0, string pruneBackups = "keep-all=1", CancellationToken cancellationToken = default);

    Task DeleteStorageAsync(string storageId, CancellationToken cancellationToken = default);

    Task<PVEStorageContent[]> GetStorageContentAsync(string node, string storageId, string? contentType = default, CancellationToken cancellationToken = default);

    Task<string> StorageExtractConfigAsync(string node, string volumeId, CancellationToken cancellationToken = default);

    #endregion

    #region Access
    Task<JsonObject> GetAccessPermissionsAsync(CancellationToken cancellationToken = default);

    Task<JsonArray> GetRolesAsync(CancellationToken cancellationToken = default);

    Task<JsonObject> GetRoleAsync(string roleId, CancellationToken cancellationToken = default);

    Task<bool> CreateRoleAsync(string name, string[] privileges, CancellationToken cancellationToken = default);

    Task<bool> UpdateRoleAsync(string name, string[] privileges, CancellationToken cancellationToken = default);

    Task<bool> DeleteRoleAsync(string name, CancellationToken cancellationToken = default);
   
    Task<JsonArray> GetGroupsAsync(CancellationToken cancellationToken = default);

    Task<bool> CreateGroupAsync(string groupId, string comment, CancellationToken cancellationToken = default);

    Task<bool> UpdateGroupAsync(string groupId, string comment, CancellationToken cancellationToken = default);

    Task<bool> DeleteGroupAsync(string groupId, CancellationToken cancellationToken = default);

    Task<JsonArray> GetUsersAsync(CancellationToken cancellationToken = default);

    Task<JsonObject> GetUserAsync(string userId, CancellationToken cancellationToken = default);

    Task<bool> CreateUserAsync(string userId, string password, IEnumerable<string> groups, string comment, CancellationToken cancellationToken = default);

    Task<bool> UpdateUserAsync(string userId, IEnumerable<string>? groups, string? comment, CancellationToken cancellationToken = default);

    Task<JsonObject> CreateUserAPITokenAsync(string userId, string tokenId, string? comment, bool? privilegeSeparation, CancellationToken cancellationToken = default);

    Task<JsonArray> GetUserAPITokensAsync(string userId, CancellationToken cancellationToken = default);

    Task<bool> DeleteUserAsync(string userId, CancellationToken cancellationToken = default);

    Task<PVEPermission[]> GetAccessControlListAsync(CancellationToken cancellationToken = default);

    Task<bool> UpdateAccessControlListAsync(string path, string[] roles, string[] groups, bool? propagate, CancellationToken cancellationToken = default);

    Task<bool> DeleteAccessControlListAsync(string path, string[] roles, string[] groups, CancellationToken cancellationToken = default);

    #endregion

    Task<PVEVNCProxy> CreateVNCProxyAsync(string node, int vmid, bool? generatePassword, CancellationToken cancellationToken);

    // Task<string> CreateUserAsync(string userId, string password, string email, IEnumerable<string> groups, CancellationToken cancellationToken = default);
}
