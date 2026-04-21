namespace MDC.Core.Services.Api;

/// <summary />
public interface IOrganizationService
{
    /// <summary />
    Task<IEnumerable<Organization>> GetAllAsync(CancellationToken cancellationToken = default);
    
    /// <summary />
    Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary />
    Task<Organization> CreateAsync(OrganizationDescriptor organizationDescriptor, CancellationToken cancellationToken = default);

    /// <summary />
    Task<Organization> UpdateAsync(Guid id, OrganizationUpdateDescriptor organizationUpdateDescriptor, CancellationToken cancellationToken = default);
    
    /// <summary />
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
