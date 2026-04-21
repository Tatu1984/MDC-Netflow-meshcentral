using MDC.Core.Models;
using MDC.Shared.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.ZeroTier;

internal interface IZeroTierService
{
    Task<ZTStatus> GetStatusAsync(CancellationToken cancellationToken = default);

    // Task<ZTControllerStatus> GetControllerStatusAsync(CancellationToken cancellationToken = default);

    Task<ZTNetwork[]> GetNetworksAsync(CancellationToken cancellationToken = default);

    Task<ZTNetwork> GetNetworkByIdAsync(string networkId, CancellationToken cancellationToken = default);

    Task<ZTMember[]> GetManagementNetworkMembersAsync(CancellationToken cancellationToken = default);

    Task<ZTMember[]> GetNetworkMembersAsync(string networkId, CancellationToken cancellationToken = default);

    Task<ZTMember> GetNetworkMemberByIdAsync(string networkId, string memberId, bool waitForNetworkMembershipRequest, DatacenterSettings? datacenterSettings, CancellationToken cancellationToken = default);

    Task DeleteNetworkAsync(string networkId, CancellationToken cancellationToken = default);

    Task<ZTNetwork> CreateNetworkAsync(string networkName, VirtualNetworkDescriptor virtualNetworkDescriptor, DatacenterSettings datacenterSettings, CancellationToken cancellationToken = default);

    Task<ZTNetwork> UpdateNetworkAsync(string networkId, ZTNetworkConfigIPAssignmentPool[]? ipAssignmentPools, ZTNetworkConfigRoute[]? routes, CancellationToken cancellationToken = default);

    Task<ZTMember> SetNetworkMemberAuthorizationAsync(string networkId, string memberId, bool authorized, CancellationToken cancellationToken = default);

    Task<ZTMember> SetNetworkMemberNameAsync(string networkId, string memberId, string name, CancellationToken cancellationToken = default);

    Task<ZTMember> SetNetworkMemberDescriptionAsync(string networkId, string memberId, string description, CancellationToken cancellationToken = default);

    Task<ZTMember> SetNetworkMemberIpAssignmentsAsync(string networkId, string memberId, IPAddress[] iPAddresses, CancellationToken cancellationToken = default);

    Task DeleteNetworkMemberAsync(string networkId, string memberId, CancellationToken cancellationToken = default);

    Task<ZTNodeConfig> GetNodeStatusAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, CancellationToken cancellationToken = default);

    Task<string> InstallZeroTierAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, CancellationToken cancellationToken = default);

    Task<ZTNetworkMembership> JoinNetworkAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, string networkId, string memberName, IPAddress[] ipAddresses, DatacenterSettings datacenterSettings, CancellationToken cancellationToken = default);

    Task<ZTNetworkMembership[]> GetNetworkMembershipAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, CancellationToken cancellationToken = default);

    Task<ZTNetworkMembership?> GetNetworkMembershipAsync(DatacenterEntryBase datacenterEntry, string node, int vmid, string networkId, CancellationToken cancellationToken = default);

    Task<ZTMember> WaitForMemberIPAssignmentAsync(string networkId, string memberId, CancellationToken cancellationToken = default);

    Task<ZTMember> WaitForMemberOnlineAsync(string networkId, string memberId, CancellationToken cancellationToken = default);
}
