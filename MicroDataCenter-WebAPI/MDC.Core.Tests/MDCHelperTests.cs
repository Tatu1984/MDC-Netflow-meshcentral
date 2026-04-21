using MDC.Shared.Models;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MDC.Core.Tests;

public class MDCHelperTests
{
    private const string WorkspaceName = "MDCHelperTest";
    private const string WorkspaceDescription = "MDCHelperTestDescription";
    private const string VirtualNetworkName = "IntegrationTestVNet";
    private const string VirtualMachineName = "MDCHelperTestVM";
    private const string VirtualMachineTemplateName = "UbuntuDesktop";

    private JsonNode SerializeObject(object obj)
    {
        var node = JsonSerializer.SerializeToNode(obj, JsonSerializerOptions.Web);
        Assert.NotNull(node);
        return node;
    }

    [Fact]
    public void Patch_Name()
    {
        var newName = "NewName";
        var original = new WorkspaceDescriptor
        {
            Name = WorkspaceName,
            Description = WorkspaceDescription,
            VirtualMachines = Array.Empty<VirtualMachineDescriptor>(),
            VirtualNetworks = Array.Empty<VirtualNetworkDescriptor>()
        };

        var delta = SerializeObject(new
        {
            Name = newName
        });
        
        var workspaceDescriptor = MDCHelper.Patch(original, delta);

        Assert.Equal(newName, workspaceDescriptor.Name);

        Assert.NotNull(workspaceDescriptor.VirtualMachines);
        Assert.Empty(workspaceDescriptor.VirtualMachines);
        Assert.NotNull(workspaceDescriptor.VirtualNetworks);
        Assert.Empty(workspaceDescriptor.VirtualNetworks);
    }

    [Fact]
    public void Patch_AddVirtualMachine_Implicit()
    {
        var original = new WorkspaceDescriptor
        {
            Name = WorkspaceName,
            Description = WorkspaceDescription,
            VirtualMachines = Array.Empty<VirtualMachineDescriptor>(),
            VirtualNetworks = Array.Empty<VirtualNetworkDescriptor>()
        };

        var delta = SerializeObject(new
        {
            VirtualMachines = new[]
            {
                new 
                {
                    TemplateName = VirtualMachineTemplateName,
                    Name = VirtualMachineName
                }
            }
        });

        var workspaceDescriptor = MDCHelper.Patch(original, delta);

        Assert.Equal(WorkspaceName, workspaceDescriptor.Name);

        Assert.NotNull(workspaceDescriptor.VirtualMachines);
        Assert.Single(workspaceDescriptor.VirtualMachines);
        Assert.Equal(VirtualMachineName, workspaceDescriptor.VirtualMachines[0].Name);
        Assert.Equal(VirtualMachineDescriptorOperation.Add, workspaceDescriptor.VirtualMachines[0].Operation);
    }

    [Fact]
    public void Patch_AddVirtualMachine_Explicit()
    {
        var original = new WorkspaceDescriptor
        {
            Name = WorkspaceName,
            Description = WorkspaceDescription,
            VirtualMachines = Array.Empty<VirtualMachineDescriptor>(),
            VirtualNetworks = Array.Empty<VirtualNetworkDescriptor>()
        };

        var delta = SerializeObject(new
        {
            VirtualMachines = new[]
            {
                new 
                {
                    Operation = "add",
                    TemplateName = VirtualMachineTemplateName,
                    Name = VirtualMachineName
                }
            }
        });

        var workspaceDescriptor = MDCHelper.Patch(original, delta);

        Assert.Equal(WorkspaceName, workspaceDescriptor.Name);

        Assert.NotNull(workspaceDescriptor.VirtualMachines);
        Assert.Single(workspaceDescriptor.VirtualMachines);
        Assert.Equal(VirtualMachineName, workspaceDescriptor.VirtualMachines[0].Name);
        Assert.Equal(VirtualMachineDescriptorOperation.Add, workspaceDescriptor.VirtualMachines[0].Operation);
    }

    [Fact]
    public void Patch_DeleteVirtualMachine_Explicit()
    {
        var original = new WorkspaceDescriptor
        {
            Name = WorkspaceName,
            Description = WorkspaceDescription,
            VirtualMachines = [new VirtualMachineDescriptor 
            { 
                TemplateName = VirtualMachineTemplateName,
                Name = VirtualMachineName
            }],
            VirtualNetworks = Array.Empty<VirtualNetworkDescriptor>()
        };

        var delta = SerializeObject(new
        {
            VirtualMachines = new[]
            {
                new
                {
                    Operation = "remove",
                    Name = VirtualMachineName
                }
            }
        });

        var workspaceDescriptor = MDCHelper.Patch(original, delta);

        Assert.Equal(WorkspaceName, workspaceDescriptor.Name);

        Assert.NotNull(workspaceDescriptor.VirtualMachines);
        Assert.Single(workspaceDescriptor.VirtualMachines);
        Assert.Equal(VirtualMachineName, workspaceDescriptor.VirtualMachines[0].Name);
        Assert.Equal(VirtualMachineDescriptorOperation.Remove, workspaceDescriptor.VirtualMachines[0].Operation);
    }
}
