using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum VirtualMachineDescriptorOperation
{
    /// <summary>
    /// 
    /// </summary>
    None,
    /// <summary>
    /// 
    /// </summary>
    Add,
    /// <summary>
    /// 
    /// </summary>
    Update,
    /// <summary>
    /// 
    /// </summary>
    Remove,
    /// <summary>
    /// 
    /// </summary>
    Reboot,
    /// <summary>
    /// 
    /// </summary>
    Restart,
    /// <summary>
    /// 
    /// </summary>
    Redeploy
}

/// <summary />
public class VirtualMachineDescriptor
{
    /// <summary />
    public string? Name { get; set; }

    /// <summary />
    public string? TemplateName {get; set;}

    /// <summary />
    public int? TemplateRevision { get; set; }

    // TODO: Specify additional properties such as:
    // See https://tensparrows.visualstudio.com/MicroDataCenter/_workitems/edit/58

    /// <summary />
    public int? CPUCores { get; set; }

    /// <summary />
    public int? MemoryMB { get; set; }

    /// <summary />
    public VirtualMachineRustDeskDescriptor? RustDesk { get; set; }

    /// <summary />
    public VirtualMachineNetworkAdapterDescriptor[]? NetworkAdapters { get; set; }

    /// <summary />
    public VirtualMachineDescriptorOperation? Operation { get; set; }
}
