using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.ZeroTier;
using MDC.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Text.Json.Nodes;

namespace MDC.Integration.Tests.Services.Api;

public class SiteNodeRegistrationServiceTests : BaseIntegrationTests
{
    [Fact]
    public async Task GetAllAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);
        RunAsPrivileged(serviceScope);

        var service = serviceScope.ServiceProvider.GetRequiredService<ISiteNodeRegistrationService>();
        Assert.NotNull(service);
        Assert.IsType<SiteNodeRegistrationService>(service);

        var siteNodeRegistrations = await service.GetAllAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(siteNodeRegistrations);
        var items = siteNodeRegistrations.ToList();
        Assert.NotNull(items);
    }
}
