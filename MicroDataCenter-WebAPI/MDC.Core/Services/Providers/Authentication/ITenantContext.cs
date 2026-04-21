using System.Security.Claims;

namespace MDC.Core.Services.Providers.Authentication;

/// <summary>
/// 
/// </summary>
public interface ITenantContext
{
    /// <summary/>
    public ClaimsPrincipal? User { get; }

    /// <summary/>
    public bool IsAuthenticated { get; }

    /// <summary/>
    public bool IsPrivilegedUser { get; }

    ///// <summary/>
    //public bool IsDatacenterTechnician { get; }

    ///// <summary/>
    //public bool IsWorkspaceManager { get; }

    ///// <summary/>
    //public bool IsWorkspaceUser { get; }

    /// <summary/>
    public bool IsDeviceRegistration { get; }

    /// <summary/>
    public Guid? ObjectId { get; }

    /// <summary/>
    public IQueryable ApplyTo<T>(IQueryable query);

    /// <summary/>
    public IEnumerable<T> ApplyToAndMaterialize<T>(IQueryable query);

    /// <summary/>
    public HashSet<string> GetSelectedPaths<T>();
}
