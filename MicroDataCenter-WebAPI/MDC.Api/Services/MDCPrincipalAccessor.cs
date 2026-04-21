using MDC.Core.Services.Providers.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.OData.Extensions;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.Identity.Web;
using Microsoft.OData.Edm;
using Microsoft.OData.UriParser;

namespace MDC.Api.Services;

internal class MDCPrincipalAccessor(IHttpContextAccessor httpContextAccessor, IEdmModel edmModel) : ITenantContext
{
    public ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public bool IsPrivilegedUser => IsGlobalAdministrator || IsDatacenterTechnician;

    public bool IsGlobalAdministrator => httpContextAccessor.HttpContext?.User.IsInRole(UserRoles.GlobalAdministrator) ?? false;

    public bool IsDatacenterTechnician => httpContextAccessor.HttpContext?.User.IsInRole(UserRoles.DatacenterTechnician) ?? false;

    public bool IsWorkspaceManager => httpContextAccessor.HttpContext?.User.IsInRole(UserRoles.WorkspaceManager) ?? false;

    public bool IsWorkspaceUser => httpContextAccessor.HttpContext?.User.IsInRole(UserRoles.WorkspaceUser) ?? false;

    public Guid? ObjectId => Guid.TryParse(httpContextAccessor.HttpContext?.User.GetObjectId(), out var id) ? id : null;

    public bool IsDeviceRegistration => httpContextAccessor.HttpContext?.User.IsInRole(UserRoles.DeviceRegistration) ?? false;

    private ODataQueryOptions? _odataQueryOptions = null;
    private ODataQueryOptions? GetODataQueryOptions<T>()
    {
        if (httpContextAccessor.HttpContext == null || httpContextAccessor.HttpContext.Request == null) return null;
        if (_odataQueryOptions != null) return null;

        var options = httpContextAccessor.HttpContext.ODataOptions();
        var component = options.RouteComponents.FirstOrDefault(c => c.Value.EdmModel == edmModel);

        string serviceRootString = $"{httpContextAccessor.HttpContext.Request.Scheme}://{httpContextAccessor.HttpContext.Request.Host}/{component.Key}";
        Uri serviceRootUri = new Uri(serviceRootString);

        var fullUri = new Uri(httpContextAccessor.HttpContext.Request.GetEncodedUrl());
        ODataUriParser parser = new ODataUriParser(edmModel, serviceRootUri, fullUri);

        var oDataQueryContext = new ODataQueryContext(edmModel, typeof(T), parser.ParsePath());
        return new ODataQueryOptions<T>(oDataQueryContext, httpContextAccessor.HttpContext.Request);
    }

    public IQueryable ApplyTo<T>(IQueryable query)
    {
        //AuthenticationTypes.Federated
        var queryOptions = GetODataQueryOptions<T>()!;
        
        var querySettings = new ODataQuerySettings
        {
            HandleNullPropagation = HandleNullPropagationOption.False
        };
        return queryOptions.ApplyTo(query, querySettings);
    }

    public IEnumerable<T> ApplyToAndMaterialize<T>(IQueryable query)
    {
        // Apply OData clauses
        var appliedDtoQuery = ApplyTo<T>(query);

        // Materialize to DTO
        var results = new List<T>();
        foreach (var item in appliedDtoQuery)
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

    private HashSet<string>? _selectedPaths = null;
    public HashSet<string> GetSelectedPaths<T>()
    {
        if (_selectedPaths != null) return _selectedPaths;

        var odataQueryOptions = GetODataQueryOptions<T>()!;

        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var clause = odataQueryOptions.SelectExpand?.SelectExpandClause;
        if (clause == null)
            return result;

        ExtractPaths(clause.SelectedItems, "", result);

        return _selectedPaths = result;
    }

    private static void ExtractPaths(
        IEnumerable<SelectItem> items,
        string prefix,
        HashSet<string> result)
    {
        foreach (var item in items)
        {
            if (item is PathSelectItem pathItem)
            {
                var segment = pathItem.SelectedPath.LastSegment.Identifier;
                var fullPath = string.IsNullOrEmpty(prefix)
                    ? segment
                    : $"{prefix}.{segment}";

                result.Add(fullPath);
            }
            else if (item is ExpandedNavigationSelectItem expandItem)
            {
                var nav = expandItem.PathToNavigationProperty.LastSegment.Identifier;
                var newPrefix = string.IsNullOrEmpty(prefix)
                    ? nav
                    : $"{prefix}.{nav}";
                result.Add(newPrefix);
                ExtractPaths(expandItem.SelectAndExpand.SelectedItems, newPrefix, result);
            }
        }
    }

    //public bool IsPropertySelected<T>(string propertyName)
    //{
    //    var odataQueryOptions = GetODataQueryOptions<T>()!;

    //    var clause = odataQueryOptions.SelectExpand?.SelectExpandClause;
    //    if (clause == null) return true;

    //    foreach (var item in clause.SelectedItems)
    //    {
    //        if (item is PathSelectItem pathItem)
    //        {
    //            var segment = pathItem.SelectedPath.LastSegment;
    //            if (segment.Identifier.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
    //                return true;
    //        }
    //    }

    //    return false;
    //}
}
