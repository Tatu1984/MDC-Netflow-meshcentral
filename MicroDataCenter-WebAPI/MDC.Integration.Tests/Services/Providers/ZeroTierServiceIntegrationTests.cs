using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace MDC.Integration.Tests.Services.Providers;

public class ZeroTierServiceIntegrationTests : BaseIntegrationTests
{
    private const string NetworkName = "MDCIntegrationTests";

    [Fact]
    public void ConfigurationTest()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var options = serviceScope.ServiceProvider.GetRequiredService<IOptions<ZeroTierServiceOptions>>();
        Assert.NotNull(options);
        var option = options.Value;
        Assert.NotNull(option);

        Assert.NotEmpty(option.BaseUrl);
        Assert.NotNull(option.Username);
        Assert.NotNull(option.Password);
    }

    [Fact]
    public async Task GetStatusAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<IZeroTierService>();
        Assert.NotNull(service);

        var status = await service.GetStatusAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(status);
        Assert.NotNull(status.Address);
        Assert.NotEmpty(status.Address);

        var networks = await service.GetNetworksAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(networks);
        Assert.NotEmpty(networks);

        foreach (var network in networks)
        {
            var networkDetail = await service.GetNetworkByIdAsync(network.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(networkDetail);
            Assert.Equal(network.Id, networkDetail.Id);

            var members = await service.GetNetworkMembersAsync(networkDetail.Id, TestContext.Current.CancellationToken);
            Assert.NotNull(members);

            foreach (var member in members)
            {
                var memberDetail = await service.GetNetworkMemberByIdAsync(networkDetail.Id, member.NodeId, false, null, TestContext.Current.CancellationToken);
                Assert.NotNull(memberDetail);
                Assert.Equal(member.Id, memberDetail.Id);
                Assert.Equal(member.NodeId, memberDetail.NodeId);
            }
        }
    }

    private async Task CleanupNetworks(IZeroTierService service)
    {
        List<string> networksToDelete = new List<string>();

        var networks = await service.GetNetworksAsync();
        foreach (var network in networks)
        {
            if (network.Config.Name == NetworkName)
            {
                networksToDelete.Add(network.Id);
                await service.DeleteNetworkAsync(network.Id);
            }
        }

        if (networksToDelete.Count == 0)
            return;

        var updpated = await service.GetNetworksAsync();
        foreach (var networkId in networksToDelete)
        {
            Assert.DoesNotContain(networkId, updpated.Select(i => i.Config.Name));
        }
    }

    [Fact]
    public async Task ManageNetworkAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<IZeroTierService>();
        Assert.NotNull(service);

        await CleanupNetworks(service);

        var createdNetwork = await service.CreateNetworkAsync(NetworkName, new Shared.Models.VirtualNetworkDescriptor { Name = "vnet0" }, new Shared.Models.DatacenterSettings(), TestContext.Current.CancellationToken);
        Assert.NotNull(createdNetwork);
        Assert.Equal(NetworkName, createdNetwork.Config.Name);
        Assert.True(createdNetwork.Config.Private);
        Assert.NotNull(createdNetwork.Id);
        Assert.NotEmpty(createdNetwork.Id);

        var networks = await service.GetNetworksAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(networks);
        Assert.NotEmpty(networks);

        Assert.Contains(createdNetwork.Id, networks.Select(i => i.Id));

        var network = await service.GetNetworkByIdAsync(createdNetwork.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(network);
        Assert.Equal(createdNetwork.Id, network.Id);

        await service.DeleteNetworkAsync(createdNetwork.Id, TestContext.Current.CancellationToken);
        var updpated = await service.GetNetworksAsync(TestContext.Current.CancellationToken);
        Assert.DoesNotContain(createdNetwork.Id, updpated.Select(i => i.Id));
    }
}
