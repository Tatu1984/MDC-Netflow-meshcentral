namespace MDC.Shared.Models;

/// <summary />
public class UserUpdateDescriptor
{
    /// <summary />
    public UserOrganizationRole[]? AddOrganizationRoles { get; set; }

    /// <summary />
    public UserOrganizationRole[]? RemoveOrganizationRoles { get; set; }

    /// <summary />
    public string[]? AddApplicationRoles { get; set; }

    /// <summary />
    public string[]? RemoveApplicationRoles { get; set; }
}
