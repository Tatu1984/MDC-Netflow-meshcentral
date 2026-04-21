namespace MDC.Shared.Models;

/// <summary />
public class UserRegistrationDescriptor
{
    /// <summary />
    public required string Id { get; set; }

    /// <summary />
    public UserOrganizationRole[]? OrganizationRoles { get; set; }

    /// <summary />
    public string[]? ApplicationRoles { get; set; }
}
