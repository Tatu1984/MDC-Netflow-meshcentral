using Microsoft.Extensions.DependencyInjection;

namespace MDC.Shared.Tests;

public class BaseSharedTests
{
    /*
     * This method assembles the service collection and creates a service scope.
     */

    private IServiceProvider? _serviceProvider;

    protected IServiceScope AssembleSharedTest(IServiceCollection serviceDescriptors)
    {
        _serviceProvider = serviceDescriptors.BuildServiceProvider();
        Assert.NotNull(_serviceProvider);

        return _serviceProvider.CreateScope();
    }
}
