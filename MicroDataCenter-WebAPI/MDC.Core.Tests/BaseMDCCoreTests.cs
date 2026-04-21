using AutoFixture;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using MDC.Shared.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using System.Text.Json;

namespace MDC.Core.Tests;

public class BaseMDCCoreTests : BaseServicesTests
{
    internal Mock<IZeroTierTokenProvider> mockZeroTierTokenProvider = new Mock<IZeroTierTokenProvider>();
    internal Mock<IZeroTierService> mockZeroTierService = new Mock<IZeroTierService>();
    internal Mock<IPVEClientService> mockPVEClientService = new Mock<IPVEClientService>();
    internal Mock<IPVEClientFactory> mockPVEClientFactory = new Mock<IPVEClientFactory>();

    internal IServiceScope AssembleBaseMDCCoreTests()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        serviceDescriptors.AddScoped<IZeroTierTokenProvider>(sp => mockZeroTierTokenProvider.Object);
        serviceDescriptors.AddScoped<IZeroTierService>(sp => mockZeroTierService.Object);
        serviceDescriptors.AddScoped<IPVEClientFactory>(sp => mockPVEClientFactory.Object);

        IServiceScope serviceScope = AssembleServicesTest(serviceDescriptors, new ConfigurationManager(), true);

        return serviceScope;
    }

    internal void RunAsPrivilegedUser(IServiceScope serviceScope)
    {
        var tenantContext = serviceScope.ServiceProvider.GetRequiredService<ITenantContext>();
        ((TestMDCPrincipalAccessor)tenantContext).IsPrivilegedUser = true;
    }

    internal void PopulateMocksForSite(DbSite dbSite)
    {
        // Ensure the SiteNode's MemberAddress is populated in the database and matches what will be returned by the ZeroTier mock, so that the SiteNode is properly associated with the Site in SiteService
        List<PVEClusterStatus> listClusterStatus = new List<PVEClusterStatus>();
        foreach (var dbSiteNode in dbSite.SiteNodes)
        {
            listClusterStatus.Add(new PVEClusterStatus
            {
                Id = $"node/{dbSiteNode.Name}",
                Name = dbSiteNode.Name,
                Type = PVEClusterStatusType.Node,
                Local = listClusterStatus.Count > 0 ? 0: 1
            });

            string networkId = $"network-{dbSiteNode.MemberAddress}";
            PopulateZeroTierMocks(networkId, dbSiteNode.MemberAddress);
            PopulatePVEClientMocks(dbSiteNode);
        }

        // Add the Cluster resources for the site
        if (listClusterStatus.Count > 1)
        {
            Fixture fixture = new Fixture();

            listClusterStatus.Add(new PVEClusterStatus
            {
                Id = $"cluster",
                Name = fixture.Create<string>(),
                Type = PVEClusterStatusType.Cluster,
                Local = listClusterStatus.Count > 0 ? 0 : 1
            });
        }
        mockPVEClientService.Setup(s => s.GetClusterStatusAsync(It.IsAny<CancellationToken>())).ReturnsAsync(listClusterStatus.ToArray());
    }

    private void PopulateZeroTierMocks(string networkId, string memberAddress)
    {
        var fixture = CreateFixture();

        var ztMember = new ZTMember
        {
            NodeId = memberAddress,
            Id = memberAddress,
            ControllerId = fixture.Create<string>(),
            Online = 1,
            Config = new ZTMemberConfig
            {
                Authorized = true,
                IPAssignments = new string[] { "192.168.1.10" },
                ActiveBridge = false,
                CreationTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                Id = memberAddress,
                NetworkId = networkId,
                Address = fixture.Create<string>()
            }
        };

        var ztNetwork = new ZTNetwork
        {
            Description = fixture.Create<string>(),
            Id = networkId,
            Config = new ZTNetworkConfig
            {
                Id = networkId,
                IpAssignmentPools = new ZTNetworkConfigIPAssignmentPool[]
                {
                    new ZTNetworkConfigIPAssignmentPool
                    {
                        IPRangeStart = "192.168.1.10",
                        IPRangeEnd = "192.168.1.100"
                    }
                },
                Name = fixture.Create<string>(),
                NetworkId = networkId,
                Private = false,
                Routes = new ZTNetworkConfigRoute[]
                {
                    new ZTNetworkConfigRoute
                    {
                        Target = "192.168.1.0/24",
                    }
                }
            }
        };

        mockZeroTierTokenProvider.Setup(s => s.GetTokenAsync(It.IsAny<CancellationToken>())).ReturnsAsync("fake-token");
        mockZeroTierService.Setup(s => s.GetNetworkByIdAsync(networkId, It.IsAny<CancellationToken>())).ReturnsAsync(ztNetwork);
        mockZeroTierService.Setup(s => s.GetManagementNetworkMembersAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new ZTMember[] { ztMember });
        // mockZeroTierService.Setup(s => s.GetManagementNetworkMembersAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new ZTMember[] { ztMember });
    }

    private class ResourceEntry
    {
        public required PVEResource Resource { get; set; }
        public required PVEQemuConfig? QemuConfig { get; set; }
    }

    private int next_vmid = 100;
    private List<ResourceEntry> listResourceEntries = new List<ResourceEntry>();

    private int AddAlpineGWTemplate(string node)
    {
        var pveResource = new PVEResource
        {
            Id = $"qemu/{next_vmid}",
            Type = PVEResourceType.Qemu,
            Node = node,
            Template = true,
            VmId = next_vmid,
            Tags = $"os_type.alpine;template-vmid.{next_vmid};gw_lan_networkinterface.net1",
            Name = "GW00.Alpine",
            MaxDisk = 53687091200,
            MaxMem = 4294967296
        };

        var pveQemuConfig = new PVEQemuConfig
        {
            Name = "GW00.Alpine",
            Cores = 1,
            Tags = $"os_type.alpine;template-vmid.{next_vmid};gw_lan_networkinterface.net1",
            Memory = "320",
            Agent = "1",
            UnknownProperties = new Dictionary<string, JsonElement>
            {
                { "net0", JsonSerializer.SerializeToElement("virtio=BC:24:11:E4:C6:4E,bridge=vmbr0,firewall=1") },
                { "net1", JsonSerializer.SerializeToElement("virtio=BC:24:11:89:75:9F,bridge=vmbr02,firewall=1,tag=3") },
                { "scsi0", JsonSerializer.SerializeToElement("local-lvm:base-99104-disk-0,discard=on,iothread=1,size=1G,ssd=1") }
            }
        };

        listResourceEntries.Add(new ResourceEntry
        { 
            Resource = pveResource,
            QemuConfig = pveQemuConfig
        });
        return next_vmid++;
    }

    private void PopulatePVEClientMocks(DbSiteNode dbSiteNode)
    {
        var fixture = CreateFixture();

        // Add the node resource for the SiteNode
        {
            var pveNodeStatus = new PVENodeStatus
            {
                CPUInfo = fixture.Create<PVENodeStatusCPUInfo>(),
                Memory = fixture.Create<PVENodeStatusMemoryInfo>(),
                CPU = fixture.Create<decimal>()
            };

            // Add the node resource for the SiteNode
            listResourceEntries.Add(new ResourceEntry
            {
                Resource = new PVEResource
                {
                    Id = $"node/{dbSiteNode.Name}",
                    Type = PVEResourceType.Node,
                    Name = dbSiteNode.Name,
                    Node = dbSiteNode.Name,
                    Mem = 13308583936,
                    MaxMem = 33656410112,
                    MaxDisk = 100861726720,
                    Disk = 13787893760
                },
                QemuConfig = null
            });

            // Add storage resource
            listResourceEntries.Add(new ResourceEntry
            {
                Resource = new PVEResource
                {
                    Id = $"storage/pve/local-lvm",
                    Type = PVEResourceType.Storage,
                    Node = dbSiteNode.Name,
                    Disk = 16909239268,
                    MaxDisk = 398802812928,
                    Content = "rootdir,images"
                },
                QemuConfig = null
            });

            mockPVEClientFactory.Setup(s => s.Create(It.IsAny<MicroDataCenterEndpoint>())).Returns(mockPVEClientService.Object);

            mockPVEClientService.Setup(s => s.GetNodeStatusAsync(dbSiteNode.Name, It.IsAny<CancellationToken>())).ReturnsAsync(pveNodeStatus);
        }

        // Add GW template
        AddAlpineGWTemplate(dbSiteNode.Name);

        mockPVEClientService.Setup(s => s.GetDatacenterSettingsAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new DatacenterSettings());
        mockPVEClientService.Setup(s => s.GetClusterResourcesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(listResourceEntries.Select(i => i.Resource));
        mockPVEClientService.Setup(s => s.GetQemuConfigAsync(dbSiteNode.Name, It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync((string node, int vmid, CancellationToken cancellationToken) => listResourceEntries.Single(r => r.Resource.Type == PVEResourceType.Qemu && r.Resource.Node == node && r.Resource.VmId == vmid).QemuConfig);

        mockPVEClientService.Setup(s => s.CreateQemuCloneAsync(dbSiteNode.Name, It.IsAny<int>(), It.IsAny<string>(), dbSiteNode.Name, It.IsAny<CancellationToken>())).ReturnsAsync((string node, int vmid, string vmName, string targetNode, CancellationToken ct) =>
        {
            var resourceEntry = listResourceEntries.Single(r => r.Resource.Type == PVEResourceType.Qemu && r.Resource.Node == node && r.Resource.VmId == vmid);
            Assert.NotNull(resourceEntry.Resource);
            Assert.NotNull(resourceEntry.QemuConfig);
            var clonedResource = JsonSerializer.Deserialize<PVEResource>(JsonSerializer.Serialize(resourceEntry.Resource));
            var clonedConfig = JsonSerializer.Deserialize<PVEQemuConfig>(JsonSerializer.Serialize(resourceEntry.QemuConfig));
            Assert.NotNull(clonedResource);
            Assert.NotNull(clonedConfig);

            clonedResource.VmId = next_vmid++;
            clonedResource.Template = null;

            listResourceEntries.Add(new ResourceEntry
            {
                Resource = clonedResource,
                QemuConfig = clonedConfig
            });

            var upid = fixture.Create<string>();
            return (clonedResource.VmId.Value, upid);
        });

        // Create mock for UpdateQemuConfigAsync
        mockPVEClientService.Setup(s => s.UpdateQemuConfigAsync(dbSiteNode.Name, It.IsAny<int>(), It.IsAny<PVEQemuConfig>(), It.IsAny<IEnumerable<PVEQemuConfigNetworkAdapter>>(), It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .Returns((string node, int vmid, PVEQemuConfig? qemuConfig, IEnumerable<PVEQemuConfigNetworkAdapter> networkAdapters, IEnumerable<string> deleteProperties, CancellationToken ct) =>
        {
            // Update the QEMU config for the specified VM in the mock data
            var resourceEntry = listResourceEntries.Single(r => r.Resource.Type == PVEResourceType.Qemu && r.Resource.Node == node && r.Resource.VmId == vmid);
            if (resourceEntry != null)
            {
                if (qemuConfig != null)
                {
                    if (qemuConfig.OnBoot != null)
                    {
                        Assert.NotNull(resourceEntry.QemuConfig);
                        resourceEntry.QemuConfig.OnBoot = qemuConfig.OnBoot;
                    }
                }
            }
            return Task.CompletedTask;
        });


        //mockPVEClientService.Setup(s => s.UpdateQemuConfigAsync(dbSiteNode.Name, It.IsAny<int>(), It.IsAny<PVEQemuConfig>(), It.IsAny<IEnumerable<PVEQemuConfigNetworkAdapter>>(), It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
        //    .Returns((string node, int vmid, string qemuConfig, IEnumerable<PVEQemuConfigNetworkAdapter> networkAdapters, IEnumerable<string> deleteProperties, CancellationToken ct) =>
        //{
        //    // var new_vmid = AddVirtualMachine(targetNode, vmName, false);
        //    //var upid = fixture.Create<string>();
        //    //return (new_vmid, upid);
        //});
    }
}
