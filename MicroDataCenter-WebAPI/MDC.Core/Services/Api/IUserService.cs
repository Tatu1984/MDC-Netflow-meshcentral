namespace MDC.Core.Services.Api;

/// <summary />
public interface IUserService
{
    /// <summary />
    Task<IEnumerable<User>> EnrichAsync(IEnumerable<User> users, CancellationToken cancellationToken);

    /// <summary />
    Task<IEnumerable<User>> GetAllAsync(bool getUnregisteredUsers, CancellationToken cancellationToken = default);


    
    /// <summary />
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary />
    Task<User> CreateAsync(UserRegistrationDescriptor userDescriptor, CancellationToken cancellationToken = default);

    /// <summary />
    Task<User> UpdateAsync(Guid id, UserUpdateDescriptor userDescriptor, CancellationToken cancellationToken = default);
    
    /// <summary />
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary />
    Task<AppRole[]> GetAppRoles(CancellationToken cancellationToken = default);
}
