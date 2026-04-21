using MDC.Core.Services.Api;
using MDC.Core.Services.Providers.MDCDatabase;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Graph;

namespace MDC.Integration.Tests.Services.Api;

public class UserServiceTests : BaseIntegrationTests
{
    [Fact]
    public async Task GetAll_Privileged_sync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        RunAsPrivileged(serviceScope);

        var usersService = serviceScope.ServiceProvider.GetRequiredService<IUserService>();
        Assert.NotNull(usersService);
        Assert.IsType<UserService>(usersService);

        var users = await usersService.GetAllAsync(true, TestContext.Current.CancellationToken);
        Assert.NotNull(users);
        Assert.NotEmpty(users);
        var all = users.ToList();

        foreach (var user in all)
        {
            var detail = await usersService.GetByIdAsync(user.Id, TestContext.Current.CancellationToken);
            if (!user.IsRegistered)
            {
                Assert.Null(detail);
                continue;
            }
            Assert.NotNull(detail);
            
            Assert.Equal(user.Id, detail.Id);
            Assert.Equal(user.DisplayName, detail.DisplayName);
            Assert.Equal(user.EmailAddress, detail.EmailAddress);
            Assert.Equal(user.IsRegistered, detail.IsRegistered);
            Assert.Equal(user.OrganizationRoles.Select(r => r.OrganizationId).ToHashSet(), detail.OrganizationRoles.Select(r => r.OrganizationId).ToHashSet());
            Assert.Equal(user.AppRoles?.ToHashSet() ?? new HashSet<string>(), detail.AppRoles?.ToHashSet() ?? new HashSet<string>());
        }
    }

    [Fact]
    public async Task GetAppRolesAsync()
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

        var service = serviceScope.ServiceProvider.GetRequiredService<IUserService>();
        Assert.NotNull(service);
        Assert.IsType<UserService>(service);

        var appRoles = await service.GetAppRoles(TestContext.Current.CancellationToken);
        Assert.NotNull(appRoles);
        Assert.NotEmpty(appRoles);  
    }
}
