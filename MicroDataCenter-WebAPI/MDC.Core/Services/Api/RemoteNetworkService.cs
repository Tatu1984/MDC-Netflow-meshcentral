using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.DtoEnrichment;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.ZeroTier;
using Microsoft.EntityFrameworkCore;
using System.Net;

namespace MDC.Core.Services.Api;

internal class RemoteNetworkService(IMDCDatabaseService databaseService, IZeroTierService zeroTierService, ITenantContext tenantContext, IDtoEnrichmentService dtoEnrichment) : IRemoteNetworkService
{
    public async Task<IEnumerable<RemoteNetwork>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        // Query
        var query = databaseService.GetAllWorkspaces().SelectMany(workspace => workspace.VirtualNetworks).Where(vnet => vnet.ZeroTierNetworkId != null);

        // Project
        var dtoQuery = query.Select(DtoProjections.ToRemoteNetwork);

        // Apply OData clauses and Materialize to DTO
        var results = tenantContext.ApplyToAndMaterialize<RemoteNetwork>(dtoQuery);

        // Enrich
        await dtoEnrichment.EnrichAsync(results, cancellationToken);

        return results;
    }

    public async Task<RemoteNetwork> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        // Convert id to 16 digit hex string containing the last 8 bytes of the Guid
        var networkId = id.ToString("N").Substring(16);

        // Query
        var query = databaseService.GetAllWorkspaces().SelectMany(workspace => workspace.VirtualNetworks).Where(vnet => vnet.ZeroTierNetworkId == networkId);

        // Project
        var dtoQuery = query.Select(DtoProjections.ToRemoteNetwork);

        // Apply OData clauses and Materialize to DTO
        var results = tenantContext.ApplyToAndMaterialize<RemoteNetwork>(dtoQuery);

        // Enrich
        await dtoEnrichment.EnrichAsync(results, cancellationToken);

        return results.SingleOrDefault() ?? throw new InvalidOperationException($"Remote Network Id '{id}' not found.");
    }

    public async Task<RemoteNetwork> UpdateAsync(Guid id, RemoteNetworkUpdate remoteNetworkUpdate, CancellationToken cancellationToken = default)
    {
        // Convert id to 16 digit hex string containing the last 8 bytes of the Guid
        var networkId = id.ToString("N").Substring(16);

        var query = databaseService.GetAllWorkspaces().SelectMany(workspace => workspace.VirtualNetworks).Where(vnet => vnet.ZeroTierNetworkId == networkId);
        var dbVirtualNetwork = await query.FirstOrDefaultAsync(cancellationToken) ?? throw new InvalidOperationException($"Remote Network Id '{id}' not found.");
        
        var ztNetwork = await zeroTierService.GetNetworkByIdAsync(networkId, cancellationToken);

        if (remoteNetworkUpdate.Members != null)
        {
            var ztMembers = await zeroTierService.GetNetworkMembersAsync(ztNetwork.Id, cancellationToken);

            var members = (from updateMember in remoteNetworkUpdate.Members
                           join ztMember in ztMembers on updateMember.Id equals ztMember.NodeId into updateGroup
                           from item in updateGroup.DefaultIfEmpty()
                           select new
                           {
                               Update = updateMember,
                               ZTMember = item
                           })
                          .ToArray();

            var notFound = members.Where(i => i.ZTMember == null).ToArray();
            if (notFound.Length > 0)
                throw new InvalidOperationException($"Cannot update members with Id {string.Join(',', notFound.Select(i => i.Update.Id).Distinct())}");

            foreach (var member in members)
            {
                if (member.Update.IPAddresses != null)
                {
                    var ipAddresses = member.Update.IPAddresses.Select(i => IPAddress.Parse(i)).ToArray();
                    var updated = await zeroTierService.SetNetworkMemberIpAssignmentsAsync(networkId, member.Update.Id, ipAddresses, cancellationToken);
                }

                if (member.Update.Name != null)
                {
                    var updated = await zeroTierService.SetNetworkMemberNameAsync(networkId, member.Update.Id, member.Update.Name, cancellationToken);
                }

                if (member.Update.Description != null)
                {
                    var updated = await zeroTierService.SetNetworkMemberDescriptionAsync(networkId, member.Update.Id, member.Update.Description, cancellationToken);
                }

                if (member.Update.Authorized.HasValue)
                {
                    var updated = await zeroTierService.SetNetworkMemberAuthorizationAsync(networkId, member.Update.Id, member.Update.Authorized.Value, cancellationToken);
                }
            }
        }

        return await GetByIdAsync(id, cancellationToken);
    }
}
