namespace MDC.Core.Services.Providers.Authentication;

/// <summary>
/// Defines user roles in the system
/// </summary>
public static class UserRoles
{
    /// <summary>
    /// Global Administrator - full system access across all datacenters
    /// </summary>
    public const string GlobalAdministrator = "GlobalAdministrator";

    /// <summary>
    /// Datacenter Technician - can manage datacenter infrastructure and resources
    /// </summary>
    public const string DatacenterTechnician = "DatacenterTechnician";

    /// <summary>
    /// Workspace Manager - can manage workspaces and their resources
    /// </summary>
    public const string WorkspaceManager = "WorkspaceManager";

    /// <summary>
    /// Workspace User - can use workspace resources but not manage them
    /// </summary>
    public const string WorkspaceUser = "WorkspaceUser";

    /// <summary>
    /// Workspace User - can use workspace resources but not manage them
    /// </summary>
    public const string DeviceRegistration = "DeviceRegistration";

    /// <summary>
    /// All available roles
    /// </summary>
    public static readonly string[] AllRoles = {
        GlobalAdministrator,
        DatacenterTechnician,
        WorkspaceManager,
        WorkspaceUser,
        DeviceRegistration
    };

    /// <summary>
    /// Checks if a role is valid
    /// </summary>
    public static bool IsValidRole(string role)
    {
        return AllRoles.Contains(role, StringComparer.OrdinalIgnoreCase);
    }
}