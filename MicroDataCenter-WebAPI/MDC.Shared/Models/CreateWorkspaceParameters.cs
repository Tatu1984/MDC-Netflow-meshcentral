namespace MDC.Shared.Models;

/// <summary>
/// 
/// </summary>
public class CreateWorkspaceParameters
{
    /// <summary>
    /// 
    /// </summary>
    public required Guid SiteId { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required Guid OrganizationId { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public required WorkspaceDescriptor Descriptor { get; set; }

    /// <summary>
    /// 
    /// </summary>
    public void Validate()
    {
        Descriptor.Validate();
    }
}
