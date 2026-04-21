using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.Authentication;
using MDC.Core.Services.Providers.ZeroTier;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Kiota.Abstractions;
using Moq;
using System;
using System.Collections.Generic;
using System.Text;

namespace MDC.Core.Tests.Services.Api;

public class UserServiceTests : BaseServicesTests
{
    /*
     * NOTE: To get this working, we need to mock Microsoft.Graph.GraphServiceClient, which is used in UserService to get user information from Microsoft Graph. 
     * However, Microsoft.Graph.GraphServiceClient does not have an interface and its methods are not virtual, which makes it difficult to mock using Moq. 
     * We would need to use a different mocking framework that supports mocking non-virtual methods, such as JustMock or Typemock, or we would need to create a wrapper interface around Microsoft.Graph.GraphServiceClient that we can mock. 
     * For now, we will skip the tests for UserService until we can figure out a way to mock Microsoft.Graph.GraphServiceClient.
     * 
     * 
    private Mock<IZeroTierTokenProvider> mockZeroTierTokenProvider = new Mock<IZeroTierTokenProvider>();
    private Mock<IZeroTierService> mockZeroTierService = new Mock<IZeroTierService>();
    private static Mock<IRequestAdapter> mockRequestAdapter = new Mock<IRequestAdapter>();
    private Mock<Microsoft.Graph.GraphServiceClient> mockGraphServiceClient = new Mock<Microsoft.Graph.GraphServiceClient>(mockRequestAdapter.Object, string.Empty);

    internal IServiceScope AssembleUserServiceTest(TestMDCPrincipalAccessor? principalAccessor)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        serviceDescriptors.AddScoped<IZeroTierTokenProvider>(sp => mockZeroTierTokenProvider.Object);
        serviceDescriptors.AddScoped<IZeroTierService>(sp => mockZeroTierService.Object);
        serviceDescriptors.AddScoped<Microsoft.Graph.GraphServiceClient>(sp => mockGraphServiceClient.Object);

        if (principalAccessor != null)
        {
            serviceDescriptors.TryAddScoped<ITenantContext>(sp => principalAccessor);
        }

        IServiceScope serviceScope = AssembleServicesTest(serviceDescriptors, new ConfigurationManager(), true);

        return serviceScope;
    }

    [Fact]
    public async Task NoUsers_GetAll_RegisteredOnly_Async()
    {
        using var serviceScope = AssembleUserServiceTest(null);
        var userService = serviceScope.ServiceProvider.GetRequiredService<IUserService>();

        var users = await userService.GetAllAsync(false, TestContext.Current.CancellationToken);
        Assert.Empty(users);
    }
    */
}
