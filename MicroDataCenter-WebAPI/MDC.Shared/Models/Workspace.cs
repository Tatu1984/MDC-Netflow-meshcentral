namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class Workspace
{
    /// <summary/>
    public required Guid Id { get; set; }

    /// <summary/>
    public Site? Site { get; set; }

    ///// <summary/>
    //public required Guid OrganizationId { get; set; }

    /// <summary/>
    public Organization? Organization { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required int Address { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required string? Description { get; set; }

    /// <summary/>
    public required bool Locked { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required DateTime CreatedAt { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required DateTime UpdatedAt { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required VirtualMachine[]? VirtualMachines { get; set; }
    /// <summary>
    /// 
    /// </summary>
    public required IEnumerable<VirtualNetwork> VirtualNetworks { get; set; }
    
    ///// <summary>
    ///// 
    ///// </summary>
    //public required Device[]? Devices { get; set; }
}
