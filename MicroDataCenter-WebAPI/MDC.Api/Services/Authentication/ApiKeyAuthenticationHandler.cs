using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Encodings.Web;

namespace MDC.Api.Services.Authentication
{
    /// <summary>
    /// Authentication handler for API key authentication
    /// </summary>
    public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationSchemeOptions>
    {
        private const string ApiKeyHeaderName = "X-API-Key";
        private const string ApiKeyQueryName = "apikey";
        
        private readonly IAPIKeyAuthenticationService _authenticationService;

        /// <summary>
        /// Initializes a new instance of the ApiKeyAuthenticationHandler
        /// </summary>
        public ApiKeyAuthenticationHandler(
            IOptionsMonitor<ApiKeyAuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            IAPIKeyAuthenticationService authenticationService) 
            : base(options, logger, encoder)
        {
            _authenticationService = authenticationService;
        }

        /// <summary>
        /// Handles the authentication request by validating the API key
        /// </summary>
        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            try
            {
                // Try to get API key from header first
                string? apiKey = Request.Headers[ApiKeyHeaderName].FirstOrDefault();

                // If not in header, try query parameter
                if (string.IsNullOrEmpty(apiKey))
                {
                    apiKey = Request.Query[ApiKeyQueryName].FirstOrDefault();
                }

                if (string.IsNullOrEmpty(apiKey))
                {
                    return AuthenticateResult.NoResult();
                }

                var principal = await _authenticationService.ValidateApiKeyAsync(apiKey);
                if (principal == null)
                {
                    return AuthenticateResult.Fail("Invalid API key");
                }

                var ticket = new AuthenticationTicket(principal, Scheme.Name);
                return AuthenticateResult.Success(ticket);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error during API key authentication");
                return AuthenticateResult.Fail("Authentication error");
            }
        }
    }

    /// <summary>
    /// Options for API key authentication scheme
    /// </summary>
    public class ApiKeyAuthenticationSchemeOptions : AuthenticationSchemeOptions
    {
    }
}