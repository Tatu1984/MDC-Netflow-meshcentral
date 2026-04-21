namespace MDC.Shared.Models;

/// <summary />
public class User
{
    /// <summary>
    /// The Principal ID of the user
    /// </summary>
    public required Guid Id { get; set; }   // Populated from Database

    /// <summary />
    public required bool IsRegistered { get; set; }   // Populated from Database

    /// <summary />
    public required IEnumerable<UserOrganizationRole> OrganizationRoles { get; set; }   // Populated from Database

    /// <summary />
    public string? DisplayName { get; set; }   // Populated from Graph

    /// <summary />
    public string? EmailAddress { get; set; }   // Populated from Graph

    /// <summary>
    /// The application roles assigned to the user
    /// </summary>
    public string[]? AppRoles { get; set; }   // Populated from Graph
}
