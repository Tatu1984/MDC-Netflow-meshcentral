using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Shared.Models;
using System.Linq.Expressions;

namespace MDC.Core.Services.Providers.DtoEnrichment;

internal static class DtoProjections
{
    public static Expression<Func<DbActivityLog, ActivityLog>> ToActivityLog =
        (entry) => new ActivityLog
        {
            Id = entry.Id,
            EntityId = entry.EntityId,
            EntityName = entry.EntityName,
            Action = entry.Action,
            ChangesJson = entry.ChangesJson,
            TimestampUtc = entry.TimestampUtc,
            UserId = entry.UserId,
            User = new User
            {
                Id = entry.UserId,
                IsRegistered = true,
                OrganizationRoles = entry.User == null ? Array.Empty<UserOrganizationRole>() : entry.User.OrganizationUserRoles
                    .Select(our => new UserOrganizationRole
                    {
                        OrganizationId = our.OrganizationId,
                        Role = our.Role
                    })
            }
        };

    public static Expression<Func<DbUser, User>> ToUser =
        (entry) => new User
        {
            Id = entry.Id,
            IsRegistered = true,
            OrganizationRoles = entry.OrganizationUserRoles
                .Select(our => new UserOrganizationRole
                {
                    OrganizationId = our.OrganizationId,
                    Role = our.Role
                })
        };

    public static Expression<Func<DbOrganization, Organization>> ToOrganization =
        (dbOrganization) => new Organization
        {
            Id = dbOrganization.Id,
            Name = dbOrganization.Name,
            Description = dbOrganization.Description,
            Active = dbOrganization.Active,

            Sites = dbOrganization.Sites.Select(dbSite => new Site
            { 
                Id = dbSite.Id,
                Name = dbSite.Name,
                Description = dbSite.Description,
                Workspaces = null,    // Don't expand Workspaces when expanding the Sites of an Organization
                Organizations = null, // Don't expand Organizations when expanding the Sites of an Organization

                // From PVE
                ClusterName = null,
                GatewayTemplates = null,
                VirtualMachineTemplates = null,

                // These propererties are ignored by JSON Serializer and OData EDM
                ApiSecret = dbSite.ApiSecret,
                ApiTokenId = dbSite.ApiTokenId,

                SiteNodes = dbSite.SiteNodes.Select(dbSiteNode => new
                {
                    dbSiteNode = dbSiteNode,
                    SiteNodeRegistrations = dbSiteNode.SiteNodeRegistrations.OrderByDescending(i => i.CompletedAt).FirstOrDefault()
                })
                .Select(entry => new SiteNode
                {
                    Id = entry.dbSiteNode.Id,
                    Name = entry.dbSiteNode.Name,
                    MachineId = entry.dbSiteNode.MachineId,
                    SerialNumber = entry.dbSiteNode.SerialNumber,

                    // From SiteNodeRegistration
                    Registered = entry.SiteNodeRegistrations == null ? null : entry.SiteNodeRegistrations.CompletedAt,

                    // From PVE
                    HostName = null,
                    CPUInfo = null,
                    Storage = null,
                    Memory = null,
                    CPU = null,

                    // From ZeroTier
                    Online = null,
                    Authorized = null,

                    // These propererties are ignored by JSON Serializer and OData EDM
                    MemberAddress = entry.dbSiteNode.MemberAddress,
                    ApiPort = entry.dbSiteNode.ApiPort,
                    ApiValidateServerCertificate = entry.dbSiteNode.ApiValidateServerCertificate,
                    DeviceInfo = entry.SiteNodeRegistrations == null ? null : entry.SiteNodeRegistrations.DeviceInfo
                })
            }),
            Workspaces = dbOrganization.Workspaces.Select(dbWorkspace => new Workspace
            { 
                Id = dbWorkspace.Id,
                Name = dbWorkspace.Name,
                Description = dbWorkspace.Description,
                Address = dbWorkspace.Address,
                Locked = dbWorkspace.Locked,
                CreatedAt = dbWorkspace.CreatedAt,
                UpdatedAt = dbWorkspace.UpdatedAt,
                Site = null,    // Don't expand Site when expanding the Workspaces of an Organization
                VirtualNetworks = dbWorkspace.VirtualNetworks.Select(dbVirtualNetwork => new VirtualNetwork
                { 
                    Id = dbVirtualNetwork.Id,
                    Name = dbVirtualNetwork.Name,
                    Index = dbVirtualNetwork.Index,
                    Tag = dbVirtualNetwork.Tag,
                    ZeroTierNetworkId = dbVirtualNetwork.ZeroTierNetworkId,
                    RemoteNetworkId = dbVirtualNetwork.ZeroTierNetworkId == null ? null : Guid.ParseExact(new string('0', 16) + dbVirtualNetwork.ZeroTierNetworkId, "N"), // Convert virtualNetwork.ZeroTierNetworkId to 16 digit hex string containing the last 8 bytes of the Guid
                    
                    // From PVE
                    GatewayStatus = null,
                    TemplateName = null,
                    TemplateRevision = null,
                    Cores = null,
                    Memory = null,
                    GatewayWANNetworkType = null,
                    GatewayWANVirtualNetworkId = null
                }),

                // From PVE
                VirtualMachines = null

            }),
            OrganizationUserRoles = dbOrganization.OrganizationUserRoles.Select(our => new OrganizationUserRole
            {
                OrganizationId = our.OrganizationId,
                OrganizationName = our.Organization == null ? string.Empty : our.Organization.Name,
                Role = our.Role,
                UserId = our.UserId
            })
        };

    public static Expression<Func<DbWorkspace, Workspace>> ToWorkspace =
        (dbWorkspace) => new Workspace
        {
            Id = dbWorkspace.Id,
            Site = new Site
            {
                Id = dbWorkspace.SiteId,
                Name = dbWorkspace.Site.Name,
                Description = dbWorkspace.Site.Description,
                Workspaces = null,    // Don't expand Workspaces when expanding the Site of a Workspace

                // From PVE
                ClusterName = null,
                GatewayTemplates = null,
                VirtualMachineTemplates = null,

                // These propererties are ignored by JSON Serializer and OData EDM
                ApiSecret = dbWorkspace.Site.ApiSecret,
                ApiTokenId = dbWorkspace.Site.ApiTokenId,
                Organizations = null,   // Don't expand Organizations when expanding the Site of a Workspace
                SiteNodes = dbWorkspace.Site.SiteNodes.Select(dbSiteNode => new
                {
                    dbSiteNode = dbSiteNode,
                    SiteNodeRegistrations = dbSiteNode.SiteNodeRegistrations.OrderByDescending(i => i.CompletedAt).FirstOrDefault()
                })
                .Select(entry => new SiteNode
                {
                    Id = entry.dbSiteNode.Id,
                    Name = entry.dbSiteNode.Name,
                    MachineId = entry.dbSiteNode.MachineId,
                    SerialNumber = entry.dbSiteNode.SerialNumber,

                    // From SiteNodeRegistration
                    Registered = entry.SiteNodeRegistrations == null ? null : entry.SiteNodeRegistrations.CompletedAt,

                    // From PVE
                    HostName = null,
                    CPUInfo = null,
                    Storage = null,
                    Memory = null,
                    CPU = null,

                    // From ZeroTier
                    Online = null,
                    Authorized = null,

                    // These propererties are ignored by JSON Serializer and OData EDM
                    MemberAddress = entry.dbSiteNode.MemberAddress,
                    ApiPort = entry.dbSiteNode.ApiPort,
                    ApiValidateServerCertificate = entry.dbSiteNode.ApiValidateServerCertificate,
                    DeviceInfo = entry.SiteNodeRegistrations == null ? null : entry.SiteNodeRegistrations.DeviceInfo
                }),
            },
            Organization = new Organization
            {
                Id = dbWorkspace.Organization.Id,
                Name = dbWorkspace.Organization.Name,
                Description = dbWorkspace.Organization.Description,
                Active = dbWorkspace.Organization.Active,
                Sites = null,   // Don't expand the Sites of an Organization when expanding the Organization of a Workspace because it would cause circular reference with the Site of a Workspace
                Workspaces = null,  // Don't expand an Organization's Workspaces when expanding the Organizations of a Workspace
                OrganizationUserRoles = dbWorkspace.Organization.OrganizationUserRoles.Select(our => new OrganizationUserRole
                {
                    OrganizationId = our.OrganizationId,
                    OrganizationName = our.Organization == null ? string.Empty : our.Organization.Name,
                    Role = our.Role,
                    UserId = our.UserId
                })
            },
            Address = dbWorkspace.Address,
            Name = dbWorkspace.Name,
            Locked = dbWorkspace.Locked,
            CreatedAt = dbWorkspace.CreatedAt,
            UpdatedAt = dbWorkspace.UpdatedAt,
            Description = dbWorkspace.Description,
            VirtualNetworks = dbWorkspace.VirtualNetworks.Select(vnet => new VirtualNetwork
            {
                Id = vnet.Id,
                Index = vnet.Index,
                Name = vnet.Name,
                RemoteNetworkId = vnet.ZeroTierNetworkId == null ? null : Guid.ParseExact(new string('0', 16) + vnet.ZeroTierNetworkId, "N"), // Convert virtualNetwork.ZeroTierNetworkId to 16 digit hex string containing the last 8 bytes of the Guid
                ZeroTierNetworkId = vnet.ZeroTierNetworkId,
                Tag = vnet.Tag,

                // From PVE
                GatewayStatus = null,
                TemplateName = null,
                TemplateRevision = null,
                Cores = null,
                Memory = null,
                GatewayWANNetworkType = null,
                GatewayWANVirtualNetworkId = null
            }),

            // From PVE
            VirtualMachines = null
            //Devices = []
        };

    public static Expression<Func<DbSite, Site>> ToSite =
        (dbSite) => new Site
        {
            Id = dbSite.Id,
            Name = dbSite.Name,
            Description = dbSite.Description,
            Workspaces = dbSite.Workspaces.Select(dbWorkspace => new Workspace
            {
                Id = dbWorkspace.Id,
                Name = dbWorkspace.Name,
                Description = dbWorkspace.Description,
                Address = dbWorkspace.Address,
                Locked = dbWorkspace.Locked,
                CreatedAt = dbWorkspace.CreatedAt,
                UpdatedAt = dbWorkspace.UpdatedAt,
                Site = null,    // Don't expand Site when expanding the Sites of a Site
                VirtualNetworks = dbWorkspace.VirtualNetworks.Select(dbVirtualNetwork => new VirtualNetwork
                {
                    Id = dbVirtualNetwork.Id,
                    Name = dbVirtualNetwork.Name,
                    Index = dbVirtualNetwork.Index,
                    Tag = dbVirtualNetwork.Tag,
                    ZeroTierNetworkId = dbVirtualNetwork.ZeroTierNetworkId,
                    RemoteNetworkId = dbVirtualNetwork.ZeroTierNetworkId == null ? null : Guid.ParseExact(new string('0', 16) + dbVirtualNetwork.ZeroTierNetworkId, "N"), // Convert virtualNetwork.ZeroTierNetworkId to 16 digit hex string containing the last 8 bytes of the Guid

                    // From PVE
                    GatewayStatus = null,
                    TemplateName = null,
                    TemplateRevision = null,
                    Cores = null,
                    Memory = null,
                    GatewayWANNetworkType = null,
                    GatewayWANVirtualNetworkId = null
                }),

                // From PVE
                VirtualMachines = null
            }),

            // From PVE
            ClusterName = null,
            GatewayTemplates = null,
            VirtualMachineTemplates = null,

            // These propererties are ignored by JSON Serializer and OData EDM
            ApiSecret = dbSite.ApiSecret,
            ApiTokenId = dbSite.ApiTokenId,

            Organizations = dbSite.Organizations.Select(dbOrganization => new Organization
            {
                Id = dbOrganization.Id,
                Name = dbOrganization.Name,
                Description = dbOrganization.Description,
                Active = dbOrganization.Active,
                Sites = null,   // Don't expand Sites when expanding the Organization of a Site
                Workspaces = null,  // Don't expand Workspaces when expanding the Organization of a Site

                OrganizationUserRoles = dbOrganization.OrganizationUserRoles.Select(our => new OrganizationUserRole
                {
                    OrganizationId = our.OrganizationId,
                    OrganizationName = our.Organization == null ? string.Empty : our.Organization.Name,
                    Role = our.Role,
                    UserId = our.UserId
                })
            }),

            SiteNodes = dbSite.SiteNodes.Select(dbSiteNode => new 
            { 
                dbSiteNode = dbSiteNode,
                SiteNodeRegistrations = dbSiteNode.SiteNodeRegistrations.OrderByDescending(i => i.CompletedAt).FirstOrDefault()
            })
            .Select(entry => new SiteNode
            {
                Id = entry.dbSiteNode.Id,
                Name = entry.dbSiteNode.Name,
                MachineId = entry.dbSiteNode.MachineId,
                SerialNumber = entry.dbSiteNode.SerialNumber,

                // From SiteNodeRegistration
                Registered = entry.SiteNodeRegistrations == null ? null: entry.SiteNodeRegistrations.CompletedAt,

                // From PVE
                HostName = null,
                CPUInfo = null,
                Storage = null,
                Memory = null,
                CPU = null,

                // From ZeroTier
                Online = null,
                Authorized = null,

                // These propererties are ignored by JSON Serializer and OData EDM
                MemberAddress = entry.dbSiteNode.MemberAddress,
                ApiPort = entry.dbSiteNode.ApiPort,
                ApiValidateServerCertificate = entry.dbSiteNode.ApiValidateServerCertificate,
                DeviceInfo = entry.SiteNodeRegistrations == null ? null : entry.SiteNodeRegistrations.DeviceInfo
            })
        };

    public static Expression<Func<DbSiteNodeRegistration, SiteNodeRegistration>> ToSiteNodeRegistration =
        (entry) => new SiteNodeRegistration
        {
            Id = entry.Id,
            UUID = entry.UUID,
            SerialNumber = entry.SerialNumber,
            MemberAddress = entry.MemberAddress,
            CreatedAt = entry.CreatedAt,
            CompletedAt = entry.CompletedAt,
            DeviceInfo = entry.DeviceInfo,
            SiteId = entry.SiteNode!.SiteId,
            SiteNodeId = entry.SiteNodeId,

            // From ZeroTier
            Online = null,  // entry.Member == null || entry.Member.Online == null ? false : entry.Member.Online.Value == 1,
            Authorized = null // entry.Member == null ? null : entry.Member.Config.Authorized,
        };

    public static Expression<Func<DbVirtualNetwork, RemoteNetwork>> ToRemoteNetwork =
        (virtualNetwork) => new RemoteNetwork
        {
            NetworkId = virtualNetwork.ZeroTierNetworkId,
            WorkspaceId = virtualNetwork.WorkspaceId,
            SiteId = virtualNetwork.Workspace!.SiteId,
            VirtualNetworkId = virtualNetwork.Id,

            // Calculated from Enrichment
            Id = null, // Id = Guid.ParseExact(new string('0', 16) + virtualNetwork.ZeroTierNetworkId, "N"),

            // From ZeroTier
            Name = virtualNetwork.Name,
            IPAssignmentPools = null,
            ManagedRoutes = null,
            Members = null
        };
}
