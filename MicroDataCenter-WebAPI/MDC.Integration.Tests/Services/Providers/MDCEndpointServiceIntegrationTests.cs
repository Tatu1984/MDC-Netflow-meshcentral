using MDC.Core.Extensions;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Shared.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MDC.Integration.Tests.Services.Providers;

public class MDCEndpointServiceIntegrationTests : BaseIntegrationTests
{
    /*
     * secrets.json file is used to load the configuration should contain the following structure for each SiteName=TheoryConfiguration used in the tests.
       {
           "MDCEndpointServiceIntegrationTests": {
               "<SiteName1>": {
                   "active": true,
                   "online": 1,
                   "authorized": true,
                   "configured": true,
                   "valid": false
               }
            }
       } 
     */

    //[Fact]
    //public async Task GetMicroDataCenterEndpointsAsync()
    //{
    //    IServiceCollection serviceDescriptors = new ServiceCollection();
    //    using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, null);

    //    var service = serviceScope.ServiceProvider.GetRequiredService<IMDCEndpointService>();
    //    Assert.NotNull(service);

    //    var mdcEndpoints = await service.GetMicroDataCenterEndpointsAsync(TestContext.Current.CancellationToken);
    //    Assert.NotNull(mdcEndpoints);
    //    Assert.NotEmpty(mdcEndpoints);

    //    foreach (var mdcEndpoint in mdcEndpoints)
    //    {
    //        Assert.NotEmpty(mdcEndpoint.SiteName);
    //        Assert.NotNull(mdcEndpoint.ZTMember);
    //        Assert.NotNull(mdcEndpoint.IPAddresses);
    //        Assert.NotEmpty(mdcEndpoint.IPAddresses);
    //        Assert.NotNull(mdcEndpoint.PVEClientConfiguration);

    //        // Test that each of the endpoints are operational and manageable by creating a PVE Client and retrieving cluster status
    //        if (mdcEndpoint.ZTMember.Online == 1 && mdcEndpoint.ZTMember.Config.Authorized && mdcEndpoint.PVEClientConfiguration != null)
    //        {
    //            var pveClient = mdcEndpoint.CreatePVEClient();
    //            Assert.NotNull(pveClient);

    //            //var clusterStatus = await pveClient.GetClusterStatusAsync();    // Note - this will fail if the PVE Client Configuration is invalid
    //            //Assert.NotNull(clusterStatus);
    //            //Assert.NotEmpty(clusterStatus);

    //            //var matchingNodes = clusterStatus.Where(i => i.Name == mdcEndpoint.SiteName).ToArray();
    //            //Assert.Single(matchingNodes);
    //        }
    //    }
    //}

    //[Theory]
    //[MemberData(nameof(GetTheoryDataRows), "MDCEndpointServiceIntegrationTests")]
    //public async Task CreatePVEClientAsync(IConfigurationSection theoryConfiguration)
    //{
    //    IServiceCollection serviceDescriptors = new ServiceCollection();
    //    using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

    //    var service = serviceScope.ServiceProvider.GetRequiredService<IMDCEndpointService>();
    //    Assert.NotNull(service);

    //    var mdcEndpoint = await service.GetMicroDataCenterSiteAsync(theoryConfiguration.Key, TestContext.Current.CancellationToken);
    //    Assert.NotNull(mdcEndpoint);
    //    Assert.Equal(theoryConfiguration.Key, mdcEndpoint!.SiteName);

    //    if (theoryConfiguration.GetValue<bool?>("active") != true) return; // Skip the test if the PVEClientService is not marked as active in the configuration        

    //    var online = theoryConfiguration.GetValue<int?>("online");
    //    Assert.Equal(online, mdcEndpoint.ZTMember.Online);

    //    var authorized = theoryConfiguration.GetValue<bool?>("authorized");
    //    Assert.Equal(authorized, mdcEndpoint.ZTMember.Config.Authorized);

    //    var configured = theoryConfiguration.GetValue<bool?>("configured");
    //    if (configured == true)
    //    {
    //        Assert.NotNull(mdcEndpoint.PVEClientConfiguration);
    //    }
    //    else
    //    {
    //        Assert.Null(mdcEndpoint.PVEClientConfiguration);
    //        return;
    //    }

    //    var valid = theoryConfiguration.GetValue<bool?>("valid");
    //    if (valid != true)
    //    {
    //        // The PVE Client Configuration is expected to be invalid, so skip the rest of the test
    //        return;
    //    }

    //    var pveClient = mdcEndpoint.CreatePVEClient();
    //    Assert.NotNull(pveClient);

    //    var clusterStatus = await pveClient.GetClusterStatusAsync(TestContext.Current.CancellationToken);    // Note - this will fail if the PVE Client Configuration is invalid
    //    Assert.NotNull(clusterStatus);
    //    Assert.NotEmpty(clusterStatus);

    //    var matchingNodes = clusterStatus.Where(i => i.Name == mdcEndpoint.SiteName).ToArray();
    //    Assert.Single(matchingNodes);
    //}

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "RegisterSites")]
    public async Task RegisterMicroDataCenterEndpointsAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.GetRequiredSection("siteDescriptor").Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        //var tokenId = theoryConfiguration.GetValue<string>("tokenId");
        //Assert.NotNull(tokenId);

        //var secret = theoryConfiguration.GetValue<string>("secret");
        //Assert.NotNull(secret);

        var siteNodeName = theoryConfiguration.GetValue<string>("siteNodeName");
        Assert.NotNull(siteNodeName);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var service = serviceScope.ServiceProvider.GetRequiredService<IMDCEndpointService>();
        Assert.NotNull(service);

        var pveClientFactory = serviceScope.ServiceProvider.GetRequiredService<IPVEClientFactory>();
        Assert.NotNull(pveClientFactory);

        var actual = await service.RegisterMicroDataCenterAsync(
            siteDescriptor.MemberAddress,
            siteNodeName,
            siteDescriptor.RegistrationUserName,
            siteDescriptor.RegistrationPassword,
            8006, 
            siteDescriptor.ValidateServerCertificate,
            30,
            TestContext.Current.CancellationToken);

        Assert.NotNull(actual);
        Assert.NotNull(actual.IPAddresses);
        Assert.True(actual.ZTMember.Config.Authorized);
        Assert.NotNull(actual.PVEClientConfiguration);

        Assert.Equal(1, actual.ZTMember.Online);
        
        var pveClient = pveClientFactory.Create(actual);
        Assert.NotNull(pveClient);
        var clusterStatus = await pveClient.GetClusterStatusAsync(TestContext.Current.CancellationToken);    // Note - this will fail if the PVE Client Configuration is invalid
        Assert.NotNull(clusterStatus);
        Assert.NotEmpty(clusterStatus);
        Assert.Equal(siteNodeName, clusterStatus.GetLocalNode().Name);
    }
}
