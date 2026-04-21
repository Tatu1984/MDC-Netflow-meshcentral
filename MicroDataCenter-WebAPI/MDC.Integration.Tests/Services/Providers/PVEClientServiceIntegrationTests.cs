using MDC.Core.Extensions;
using MDC.Core.Services.Providers.MDCEndpoint;
using MDC.Core.Services.Providers.PVEClient;
using MDC.Shared.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

/*  These tests requires the following user secrets to be set up in the MDC.IntegrationTests project.
{
  "PVEClientService": {
    "baseUrl": "https://<ProxMox Address>:8006/api2/json/",
    "authenticationScheme": "PVEAPIToken",
    "tokenId": "<API Access Token>",
    "secret": "<API Access Token Secret>",
    "validateServerCertificate": false <!-- Optional: Set to true in production (default), false for testing -->
  }
} 
*/

namespace MDC.Integration.Tests.Services.Providers;

public class PVEClientServiceIntegrationTests : BaseIntegrationTests
{
    private const string TestRoleId = "integration-test-role";
    private const string TestGroupId = "integration-test-group";
    private const string TestAccessControlListPath = "/";
    private const string TestUserId = "integration-test-user@pve";

    private async Task<IPVEClientService> GetPrivilegedPVEClient(IServiceScope serviceScope, IConfigurationSection theoryConfiguration)
    {
        var ipAddress = theoryConfiguration.GetValue<string>("ipAddress") ?? throw new InvalidOperationException("IP Address not configured");
        var username = theoryConfiguration.GetValue<string>("username") ?? throw new InvalidOperationException("Privileged User Name not configured");
        var password = theoryConfiguration.GetValue<string>("password") ?? throw new InvalidOperationException("Privileged Password not configured");
        var proxyBaseUrl = theoryConfiguration.GetValue<string>("proxyBaseUrl");

        var pveClientFactory = serviceScope.ServiceProvider.GetRequiredService<IPVEClientFactory>();
        Assert.NotNull(pveClientFactory);

        var pveClient = pveClientFactory.Create(ipAddress, 8006, false, null, proxyBaseUrl);
        Assert.NotNull(pveClient);
        _ = await pveClient.AuthenticateWithAccessTicketAsync(username, password, TestContext.Current.CancellationToken);

        return pveClient;
    }

    private async Task CleanupAsync(IPVEClientService pveClient)
    {
        // Remove test user if it exists
        var users = await pveClient.GetUsersAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(users);
        foreach (var user in users.Where(u => u?["userid"]?.GetValue<string>() == TestUserId))
        {
            var successDelete = await pveClient.DeleteUserAsync(TestUserId, TestContext.Current.CancellationToken);
            Assert.True(successDelete);
        }

        // Remove test access control list entry if it exists
        var acl = await pveClient.GetAccessControlListAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(acl);
        foreach (var aclEntry in acl.Where(entry => entry.Path == TestAccessControlListPath && entry.Type == "group" && entry.UserGroupId == TestGroupId && entry.RoleId == TestRoleId))
        {
            var successDelete = await pveClient.DeleteAccessControlListAsync(TestAccessControlListPath, new string[] { TestRoleId }, new string[] { TestGroupId }, TestContext.Current.CancellationToken);
            Assert.True(successDelete);
        }

        // Remove test role if it exists
        var roles = await pveClient.GetRolesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(roles);
        foreach (var role in roles.Where(r => r?["roleId"]?.GetValue<string>() == TestRoleId))
        {
            var successDelete = await pveClient.DeleteRoleAsync(TestRoleId, TestContext.Current.CancellationToken);
            Assert.True(successDelete);
        }

        // Remove test group if it exists
        var groups = await pveClient.GetGroupsAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(groups);
        foreach (var group in groups.Where(g => g?["groupid"]?.GetValue<string>() == TestGroupId))
        {
            var successDelete = await pveClient.DeleteGroupAsync(TestGroupId, TestContext.Current.CancellationToken);
            Assert.True(successDelete);
        }
    }

    private async Task CreateRoleAsync(IPVEClientService pveClient, string[] privileges)
    {
        // Create the role
        var success = await pveClient.CreateRoleAsync(TestRoleId, privileges, TestContext.Current.CancellationToken);
        Assert.True(success);

        // Verify the role was created
        var roles = await pveClient.GetRolesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(roles);
        Assert.Contains(roles, r => r?["roleId"]?.GetValue<string>() == TestRoleId);
        var role = roles.First(r => r?["roleId"]?.GetValue<string>() == TestRoleId);
        var rolePrivileges = role?["privs"]?.GetValue<string>().Split(',');
        Assert.NotNull(rolePrivileges);
        Assert.Equal(privileges.Length, rolePrivileges.Length);
        foreach (var privilege in privileges)
        {
            Assert.Contains(privilege, rolePrivileges);
        }
    }

    private async Task CreateGroupAsync(IPVEClientService pveClient)
    {
        var comment = "Integration Test Group";
        // Create the group
        var success = await pveClient.CreateGroupAsync(TestGroupId, comment, TestContext.Current.CancellationToken);
        Assert.True(success);

        // Verify the group was created
        var groups = await pveClient.GetGroupsAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(groups);
        Assert.Contains(groups, g => g?["groupid"]?.GetValue<string>() == TestGroupId);
        var group = groups.First(g => g?["groupid"]?.GetValue<string>() == TestGroupId);
        Assert.Equal(comment, group?["comment"]?.GetValue<string>());
    }

    [Theory(DisableDiscoveryEnumeration =false)]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public void ConfigurationTest(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClientServiceOptions = theoryConfiguration.Get<TokenPVEClientServiceOptions>();
        Assert.NotNull(pveClientServiceOptions);

        Assert.NotEmpty(pveClientServiceOptions.Host);
        Assert.NotNull(pveClientServiceOptions.AuthenticationScheme);
        Assert.Equal("PVEAPIToken", pveClientServiceOptions.AuthenticationScheme);
        Assert.NotNull(pveClientServiceOptions.TokenId);
        Assert.NotNull(pveClientServiceOptions.Secret);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public async Task GetClusterStatusAsync(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClientServiceOptions = theoryConfiguration.Get<TokenPVEClientServiceOptions>();
        Assert.NotNull(pveClientServiceOptions);

        var pveClient = CreatePVEClient(serviceScope, theoryConfiguration);
        Assert.NotNull(pveClient);

        // ACT: Call the method to get the cluster status
        var clusterStatus = await pveClient.GetClusterStatusAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(clusterStatus);
        Assert.NotEmpty(clusterStatus);

        var clusterNode = clusterStatus.GetClusterNode(); 
        Assert.NotNull(clusterNode);
        Assert.NotNull(clusterNode.Name);
        Assert.Equal(theoryConfiguration.Key, clusterNode.Name);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public async Task GetClusterResourcesAsync(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        // ACT: Call the method to get the cluster resources
        var clusterResources = await CreatePVEClient(serviceScope, theoryConfiguration).GetClusterResourcesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(clusterResources);
        Assert.NotEmpty(clusterResources);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public async Task GetQemuConfigAsync(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = CreatePVEClient(serviceScope, theoryConfiguration);

        var clusterResources = await pveClient.GetClusterResourcesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(clusterResources);

        // ACT: Call the method to get the QEMU VM configurations for all QEMU resources in the cluster
        var configs = await Task.WhenAll(clusterResources.Where(resource => resource.Type == PVEResourceType.Qemu)
            .Select(async resource =>
            {
                Assert.NotNull(resource.Node);
                Assert.NotNull(resource.VmId);

                var qemuConfig = await pveClient.GetQemuConfigAsync(resource.Node, resource.VmId.Value);
                Assert.NotNull(qemuConfig);

                return qemuConfig;
            })
        );

        Assert.NotEmpty(configs);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public async Task CreateQemuCloneAsync(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = CreatePVEClient(serviceScope, theoryConfiguration);

        var pveResources = await pveClient.GetClusterResourcesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(pveResources);

        var template = pveResources.FirstOrDefault(i => i.Template == true && i.Node != null && i.VmId != null && i.Name == "BA00.UbuntuDesktop");
        Assert.NotNull(template);
        Assert.NotNull(template.Node);
        Assert.NotNull(template.VmId);

        var targetName = $"9999{template.Name}-IntegrationTest";
        var targetNode = template.Node;
        foreach (var resource in pveResources.Where(i => i.Name == targetName))
        {
            Assert.NotNull(resource.Node);
            Assert.NotNull(resource.VmId);
            var deleteUpid = await pveClient.DeleteQemuAsync(resource.Node, resource.VmId.Value, true, true, TestContext.Current.CancellationToken);
            Assert.NotNull(deleteUpid);

            await pveClient.WaitForTaskAsync(targetNode, deleteUpid, TestContext.Current.CancellationToken);
        }
        
        // ACT
        var (vmid, upid) = await pveClient.CreateQemuCloneAsync(template.Node, template.VmId.Value, targetName, targetNode, TestContext.Current.CancellationToken);
        Assert.NotNull(upid);
        await pveClient.WaitForTaskAsync(targetNode, upid, TestContext.Current.CancellationToken);

        var qemuConfig = await pveClient.GetQemuConfigAsync(targetNode, vmid, TestContext.Current.CancellationToken);
        Assert.NotNull(qemuConfig);
        var networkDevices = qemuConfig.ParseNetworkAdapters();
        Assert.NotEmpty(networkDevices);

        // Set onboot to false whenever cloning a template
        if (qemuConfig.OnBoot == 1)
        {
            await pveClient.UpdateQemuConfigAsync(targetNode, vmid, new PVEQemuConfig { OnBoot = 0 }, [], [], TestContext.Current.CancellationToken);

            var updatedQemuConfig = await pveClient.GetQemuConfigAsync(targetNode, vmid, TestContext.Current.CancellationToken);
            Assert.NotNull(updatedQemuConfig);
            Assert.Equal(0, updatedQemuConfig.OnBoot);
        }

        var cleanupUpid = await pveClient.DeleteQemuAsync(targetNode, vmid, true, true, TestContext.Current.CancellationToken);
        Assert.NotNull(cleanupUpid);
        await pveClient.WaitForTaskAsync(targetNode, cleanupUpid, TestContext.Current.CancellationToken);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public async Task GetQemuStatusCurrentAsync(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = CreatePVEClient(serviceScope, theoryConfiguration);

        var clusterResources = await pveClient.GetClusterResourcesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(clusterResources);

        // ACT: Call the method to get the Qemu current status for all QEMU resources in the cluster
        var statuses = await Task.WhenAll(clusterResources.Where(resource => resource.Type == PVEResourceType.Qemu)
            .Select(async resource =>
            {
                Assert.NotNull(resource.Node);
                Assert.NotNull(resource.VmId);

                var qemuStatus = await pveClient.GetQemuStatusCurrentAsync(resource.Node, resource.VmId.Value, TestContext.Current.CancellationToken);
                Assert.NotNull(qemuStatus);
                return qemuStatus;
            }));
        Assert.NotEmpty(statuses);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public async Task QemuAgentPingAsync(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = CreatePVEClient(serviceScope, theoryConfiguration);

        var clusterResources = await pveClient.GetClusterResourcesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(clusterResources);

        // ACT: Call the method to get the Qemu current status and ping the agent for all QEMU resources in the cluster
        var statuses = await Task.WhenAll(clusterResources.Where(resource => resource.Type == PVEResourceType.Qemu && resource.Template != true)
            .Select(async resource =>
            {
                Assert.NotNull(resource.Node);
                Assert.NotNull(resource.VmId);

                var qemuStatus = await pveClient.GetQemuStatusCurrentAsync(resource.Node, resource.VmId.Value);
                Assert.NotNull(qemuStatus);

                if (qemuStatus.Qmpstatus == "running" && qemuStatus.Agent == 1)
                {
                    var pingResult = await pveClient.QemuAgentPingAsync(resource.Node, resource.VmId.Value);
                    // Assert.True(pingResult);
                }

                return qemuStatus;
            }));

        Assert.NotEmpty(statuses);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public async Task QemuAgentGetNetworkInterfacesAsync(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = CreatePVEClient(serviceScope, theoryConfiguration);

        var clusterResources = await pveClient.GetClusterResourcesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(clusterResources);

        // ACT: Call the method to get the Qemu current status and ping the agent for all QEMU resources in the cluster
        var results = await Task.WhenAll(clusterResources.Where(resource => resource.Type == PVEResourceType.Qemu && resource.Template != true)
            .Select(async resource =>
            {
                Assert.NotNull(resource.Node);
                Assert.NotNull(resource.VmId);

                var qemuStatus = await pveClient.GetQemuStatusCurrentAsync(resource.Node, resource.VmId.Value, TestContext.Current.CancellationToken);
                Assert.NotNull(qemuStatus);

                if (qemuStatus.Qmpstatus == "running" && qemuStatus.Agent == 1)
                {
                    var pingResult = await pveClient.QemuAgentPingAsync(resource.Node, resource.VmId.Value, TestContext.Current.CancellationToken);
                    Assert.True(pingResult);

                    var networkInterfaces = await pveClient.QemuAgentGetNetworkInterfacesAsync(resource.Node, resource.VmId.Value, TestContext.Current.CancellationToken);
                    Assert.NotNull(networkInterfaces);

                    return (qemuStatus, networkInterfaces);
                }

                return (qemuStatus, []);
            }));

        Assert.NotEmpty(results);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests")]
    public async Task QemuAgentExecAsync(IConfigurationSection theoryConfiguration)
    {
        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = CreatePVEClient(serviceScope, theoryConfiguration);

        var clusterResources = await pveClient.GetClusterResourcesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(clusterResources);

        // ACT: Call the method to get the Qemu current status and ping the agent for all QEMU resources in the cluster
        var results = await Task.WhenAll(clusterResources.Where(resource => resource.Type == PVEResourceType.Qemu && resource.Template != true)
            .Take(1)
            .Select(async resource =>
            {
                Assert.NotNull(resource.Node);
                Assert.NotNull(resource.VmId);

                var qemuStatus = await pveClient.GetQemuStatusCurrentAsync(resource.Node, resource.VmId.Value, TestContext.Current.CancellationToken);
                Assert.NotNull(qemuStatus);

                if (qemuStatus.Qmpstatus == "running" && qemuStatus.Agent == 1)
                {
                    var pingResult = await pveClient.QemuAgentPingAsync(resource.Node, resource.VmId.Value, TestContext.Current.CancellationToken);
                    Assert.True(pingResult);

                    var result = await pveClient.QemuAgentExecAsync(resource.Node, resource.VmId.Value, "ls -la", TestContext.Current.CancellationToken);
                    Assert.Equal(0, result.ExitCode);

                    return (qemuStatus, result.Output);
                }

                return (qemuStatus, null);
            }));
        Assert.NotEmpty(results);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task CreateAccessTicketAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);
        
        var clusterStatus = await pveClient.GetClusterStatusAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(clusterStatus);
        Assert.NotEmpty(clusterStatus);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task GetRolesAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);

        var roles = await pveClient.GetRolesAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(roles);
        Assert.NotEmpty(roles);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task GetRoleAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);

        await CleanupAsync(pveClient);

        // Expect to throw an exception when the role does not exist
        await Assert.ThrowsAsync<HttpRequestException>(async () =>
        {
            var role = await pveClient.GetRoleAsync(TestRoleId, TestContext.Current.CancellationToken);
        });

        await CreateRoleAsync(pveClient, new string[] { "VM.Audit" });

        var role = await pveClient.GetRoleAsync(TestRoleId, TestContext.Current.CancellationToken);
        Assert.NotNull(role);

        await CleanupAsync(pveClient);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task CRUDRoleAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);

        await CleanupAsync(pveClient);

        await CreateRoleAsync(pveClient, new string[] { "VM.Audit", "VM.Console", "VM.PowerMgmt" });
        
        {
            // Update the role
            string[] privileges = new string[] { "VM.Audit", "VM.Console", "VM.PowerMgmt", "VM.Clone" };
            var success = await pveClient.UpdateRoleAsync(TestRoleId, privileges, TestContext.Current.CancellationToken);
            Assert.True(success);

            // Verify the role was created
            var roles = await pveClient.GetRolesAsync(TestContext.Current.CancellationToken);
            Assert.NotNull(roles);
            Assert.Contains(roles, r => r?["roleId"]?.GetValue<string>() == TestRoleId);
            var role = roles.First(r => r?["roleId"]?.GetValue<string>() == TestRoleId);
            var rolePrivileges = role?["privs"]?.GetValue<string>().Split(',');
            Assert.NotNull(rolePrivileges);
            Assert.Equal(privileges.Length, rolePrivileges.Length);
            foreach (var privilege in privileges)
            {
                Assert.Contains(privilege, rolePrivileges);
            }
        }

        await CleanupAsync(pveClient);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task GetGroupsAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);

        var groups = await pveClient.GetGroupsAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(groups);
        Assert.NotEmpty(groups);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task CRUDGroupAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);

        await CleanupAsync(pveClient);

        await CreateRoleAsync(pveClient, new string[] { "VM.Audit", "VM.Console", "VM.PowerMgmt" });

        await CreateGroupAsync(pveClient);
        
        await CleanupAsync(pveClient);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task GetUsersAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);

        var users = await pveClient.GetUsersAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(users);
        Assert.NotEmpty(users);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task GetAccessControlListAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);

        var acl = await pveClient.GetAccessControlListAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(acl);
        Assert.NotEmpty(acl);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task CRUDAccessControlListAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);

        await CleanupAsync(pveClient);

        await CreateRoleAsync(pveClient, new string[] { "Sys.Audit", "VM.Console", "VM.PowerMgmt" });

        await CreateGroupAsync(pveClient);

        // Create ACL entry
        var successCreate = await pveClient.UpdateAccessControlListAsync(TestAccessControlListPath, new string[] { TestRoleId }, new string[] { TestGroupId }, true, TestContext.Current.CancellationToken);
        Assert.True(successCreate);
        // Verify ACL entry was created
        var acl = await pveClient.GetAccessControlListAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(acl);
        Assert.Contains(acl, entry => entry.Path == TestAccessControlListPath && entry.Type == "group" && entry.UserGroupId == TestGroupId && entry.RoleId == TestRoleId && entry.Propagate == 1);
        await CleanupAsync(pveClient);
    }

    [Theory]
    [MemberData(nameof(GetTheoryDataRows), "PVEClientServiceIntegrationTests_Privileged")]
    public async Task CRUDUserAsync(IConfigurationSection theoryConfiguration)
    {
        var siteDescriptor = theoryConfiguration.Get<SiteDescriptor>();
        Assert.NotNull(siteDescriptor);

        IServiceCollection serviceDescriptors = new ServiceCollection();
        using IServiceScope serviceScope = AssembleIntegrationTest(serviceDescriptors, theoryConfiguration);
        
        var mdcEndpointOptions = serviceScope.ServiceProvider.GetRequiredService<IOptions<MDCEndpointServiceOptions>>();

        var pveClient = await GetPrivilegedPVEClient(serviceScope, theoryConfiguration);

        await CleanupAsync(pveClient);

        await CreateRoleAsync(pveClient, new string[] { "Sys.Audit", "VM.Console", "VM.PowerMgmt" });

        await CreateGroupAsync(pveClient);

        // Create ACL entry
        var successCreate = await pveClient.UpdateAccessControlListAsync(TestAccessControlListPath, new string[] { TestRoleId }, new string[] { TestGroupId }, true, TestContext.Current.CancellationToken);
        Assert.True(successCreate);

        // Create the user
        var password = "Integration-Test-Password!";
        var success = await pveClient.CreateUserAsync(TestUserId, password, new string[] { TestGroupId }, "Integration Test User", TestContext.Current.CancellationToken);
        Assert.True(success);
        // Verify the user was created
        var users = await pveClient.GetUsersAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(users);
        Assert.Contains(users, u => u?["userid"]?.GetValue<string>() == TestUserId);
        
        var user = await pveClient.GetUserAsync(TestUserId, TestContext.Current.CancellationToken);
        Assert.NotNull(user);

        // Verify the user is a member of the groups
        var groups = user["groups"]?.AsArray()?.Select(i => i?.GetValue<string>()).ToArray();
        Assert.NotNull(groups);
        Assert.Contains(TestGroupId, groups);



        // Generate API Token for the user
        {
            var existingTokens = await pveClient.GetUserAPITokensAsync(TestUserId, TestContext.Current.CancellationToken);
            Assert.NotNull(existingTokens);
            Assert.Empty(existingTokens);
        }

        var apiTokenResponse = await pveClient.CreateUserAPITokenAsync(TestUserId, "testtoken", "integration-test-token", false, TestContext.Current.CancellationToken);
        Assert.NotNull(apiTokenResponse);
        var fullTokenId = apiTokenResponse?["full-tokenid"]?.GetValue<string>();
        Assert.NotNull(fullTokenId);
        var value = apiTokenResponse?["value"]?.GetValue<string>();
        Assert.NotNull(value);
        Assert.NotNull(apiTokenResponse?["info"]?.AsObject());

        {
            var existingTokens = await pveClient.GetUserAPITokensAsync(TestUserId, TestContext.Current.CancellationToken);
            Assert.NotNull(existingTokens);
            Assert.NotEmpty(existingTokens);
        }

        // Verify the API Token works
        //var ipAddress = IPAddress.Parse(theoryConfiguration.GetValue<string>("ipAddress") ?? throw new InvalidOperationException("IP Address not configured"));
        //var urlBuilder = new UriBuilder
        //{
        //    Scheme = "https",
        //    Host = ipAddress.ToString(),
        //    Port = 8006,
        //    Path = "/api2/json/"
        //};


        var pveClientFactory = serviceScope.ServiceProvider.GetRequiredService<IPVEClientFactory>();
        Assert.NotNull(pveClientFactory);

        var pveClientServiceOptions = new TokenPVEClientServiceOptions
        {
            Host = theoryConfiguration.GetValue<string>("ipAddress") ?? throw new InvalidOperationException("IP Address not configured"),
            ProxyBaseUrl = mdcEndpointOptions.Value.ProxyBaseUrl,
            AuthenticationScheme = TokenPVEClientServiceOptions.DefaultPVEAuthScheme,
            TokenId = fullTokenId,
            Secret = value,
            ValidateServerCertificate = false
        };
        var userPveClient = pveClientFactory.Create(pveClientServiceOptions);
        Assert.NotNull(userPveClient);
        var clusterStatus = await userPveClient.GetClusterStatusAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(clusterStatus);

        await CleanupAsync(pveClient);
    }
}
