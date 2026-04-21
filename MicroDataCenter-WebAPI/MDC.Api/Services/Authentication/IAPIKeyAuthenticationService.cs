using System.Security.Claims;

namespace MDC.Api.Services.Authentication
{
    /// <summary>
    /// Service for handling authentication and authorization
    /// </summary>
    public interface IAPIKeyAuthenticationService
    {
        /// <summary>
        /// Validates an API key and returns user information
        /// </summary>
        /// <param name="apiKey">The API key to validate</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>User claims if valid, null if invalid</returns>
        Task<ClaimsPrincipal?> ValidateApiKeyAsync(string apiKey, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets user roles from Keycloak token
        /// </summary>
        /// <param name="principal">The claims principal from JWT token</param>
        /// <returns>List of user roles</returns>
        IEnumerable<string> GetUserRoles(ClaimsPrincipal principal);

        /// <summary>
        /// Checks if user has required role
        /// </summary>
        /// <param name="principal">The claims principal</param>
        /// <param name="requiredRole">The required role</param>
        /// <returns>True if user has the role</returns>
        bool HasRole(ClaimsPrincipal principal, string requiredRole);
    }
}