using MDC.Core.Services.Api;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Integration.Tests.Services.Api;

public class RemoteNetworkServiceTests : BaseIntegrationTests
{
    [Fact]
    public async Task GetAllAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var remoteNetworkService = serviceScope.ServiceProvider.GetRequiredService<IRemoteNetworkService>();
        Assert.NotNull(remoteNetworkService);

        var remoteNetworks = await remoteNetworkService.GetAllAsync(TestContext.Current.CancellationToken);
        
        foreach (var remoteNetwork in remoteNetworks)
        {
            Assert.NotNull(remoteNetwork);
            Assert.NotNull(remoteNetwork.Id);
            var detail = await remoteNetworkService.GetByIdAsync(remoteNetwork.Id.Value, TestContext.Current.CancellationToken);
            Assert.NotNull(detail);
        }
    }
}
