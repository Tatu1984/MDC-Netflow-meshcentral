using MDC.Core.Services.Providers.Authentication;
using System.Security.Claims;
using System.Security.Principal;

namespace MDC.Core.Tests;

public class TestMDCPrincipalAccessor : ITenantContext
{
    public ClaimsPrincipal? User => new ClaimsPrincipal(new GenericIdentity("TestUser"));

    public bool IsAuthenticated { get; set; }

    public bool IsPrivilegedUser { get; set; }

    public bool IsDeviceRegistration { get; set; }

    //public bool IsDatacenterTechnician { get; set; }

    //public bool IsWorkspaceManager { get; set; }

    //public bool IsWorkspaceUser { get; set; }

    public Guid? ObjectId { get; set; }

    public IQueryable ApplyTo<T>(IQueryable query)
    {
        return query;
    }

    public IEnumerable<T> ApplyToAndMaterialize<T>(IQueryable query)
    {
        // Materialize to DTO
        var results = new List<T>();
        foreach (var item in query)
        {
            if (item is T dto)
            {
                results.Add(dto);
                continue;
            }

            var prop = item.GetType().GetProperty("Instance");
            if (prop?.GetValue(item) is T inner)
            {
                results.Add(inner);
                continue;
            }
            throw new NotImplementedException();
        }

        return results;
    }

    public HashSet<string> GetSelectedPaths<T>()
    {
        return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    }

    //public bool IsPropertySelected<T>(string propertyName)
    //{
    //    throw new NotImplementedException();
    //}
}