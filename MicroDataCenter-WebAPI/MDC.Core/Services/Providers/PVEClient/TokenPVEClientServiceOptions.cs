namespace MDC.Core.Services.Providers.PVEClient;

internal class TokenPVEClientServiceOptions
{
    public const string DefaultPVEAuthScheme = "PVEAPIToken";
    // public static string ConfigurationSectionName => "PVEClientService";

    public required string Host { get; set; }
    
    public int Port = 8006;

    public required string? ProxyBaseUrl { get; set; }
    
    public string AuthenticationScheme { get; set; } = DefaultPVEAuthScheme; // Default to PVE API Token authentication
    
    public required string TokenId { get; set; }
    
    public required string Secret { get; set; }
    
    public bool ValidateServerCertificate { get; set; } = true; // Default to validating server certificate
    
    public int? Timeout { get; set; } // Default timeout in seconds is 30 seconds
    //public string? SiteName { get; set; } // Optional site identifier for multi-node deployments

    /*
    public string Realm { get; set; } = "pam"; // Default to 'pam' realm
    
    public bool UseSsl { get; set; } = true; // Default to using SSL
    public string ApiVersion { get; set; } = "v2"; // Default API version
    public string? ProxyUrl { get; set; } // Optional proxy URL
    public int MaxRetries { get; set; } = 3; // Default number of retries for requests
    public int RetryDelay { get; set; } = 1000; // Default delay between retries in milliseconds
    
    public string? CustomHeaders { get; set; } // Optional custom headers for requests
    public string? UserAgent { get; set; } = "MDCClient/1.0"; // Default user agent for requests
    public bool EnableLogging { get; set; } = false; // Default to not enabling logging
    public string? LogFilePath { get; set; } // Optional log file path if logging is enabled
    public string? ClientId { get; set; } // Optional client ID for OAuth2 or other authentication methods
    public string? ClientSecret { get; set; } // Optional client secret for OAuth2 or other authentication methods
    public string? AccessToken { get; set; } // Optional access token for authenticated requests
    public string? RefreshToken { get; set; } // Optional refresh token for OAuth2 or other authentication methods
    public bool UseCompression { get; set; } = false; // Default to not using compression
    public int ConnectionLimit { get; set; } = 100; // Default connection limit for HTTP client
    public string? AcceptLanguage { get; set; } // Optional Accept-Language header for localization
    public string? AcceptEncoding { get; set; } // Optional Accept-Encoding header for content encoding
    public string? ContentType { get; set; } = "application/json"; // Default content type for requests
    public bool EnableTelemetry { get; set; } = false; // Default to not enabling telemetry
    public string? TelemetryEndpoint { get; set; } // Optional endpoint for telemetry data
    public string? CertificateThumbprint { get; set; } // Optional certificate thumbprint for client certificate authentication
    public bool UseClientCertificate { get; set; } = false; // Default to not using client certificate
    public string? CertificatePath { get; set; } // Optional path to the client certificate file
    public string? CertificatePassword { get; set; } // Optional password for the client certificate
    public bool EnableCaching { get; set; } = false; // Default to not enabling caching
    public TimeSpan CacheDuration { get; set; } = TimeSpan.FromMinutes(5); // Default cache duration
    public string? CacheDirectory { get; set; } // Optional directory for caching responses
    public bool EnableRateLimiting { get; set; } = false; // Default to not enabling rate limiting
    public int MaxRequestsPerSecond { get; set; } = 10; // Default maximum requests per second
    public string? CustomUserAgent { get; set; } // Optional custom user agent for requests
    public bool EnableDebugMode { get; set; } = false; // Default to not enabling debug mode
    public string? DebugLogFilePath { get; set; } // Optional debug log file path if debug mode is enabled
    public string? ApiKey { get; set; } // Optional API key for authentication
    public string? ApiSecret { get; set; } // Optional API secret for authentication
    public string? OAuthTokenUrl { get; set; } // Optional URL for OAuth token retrieval
    public string? OAuthClientId { get; set; } // Optional client ID for OAuth authentication
    public string? OAuthClientSecret { get; set; } // Optional client secret for OAuth authentication
    public string? OAuthScope { get; set; } // Optional scope for OAuth authentication
    public bool UseBearerToken { get; set; } = false; // Default to not using bearer token authentication
    public string? BearerToken { get; set; } // Optional bearer token for authentication
    public bool EnableDebugLogging { get; set; } = false; // Default to not enabling debug logging
    public string? DebugLogLevel { get; set; } = "Info"; // Default log level for debug logging
    public string? CustomApiVersion { get; set; } // Optional custom API version for requests
    public bool UseDefaultHeaders { get; set; } = true; // Default to using default headers for requests
    public string? DefaultHeaders { get; set; } // Optional default headers for requests
    public bool EnableResponseCaching { get; set; } = false; // Default to not enabling response caching
    public TimeSpan ResponseCacheDuration { get; set; } = TimeSpan.FromMinutes(10); // Default response cache duration
    public string? ResponseCacheDirectory { get; set; } // Optional directory for response caching
    public bool EnableRequestLogging { get; set; } = false; // Default to not enabling request logging
    public string? RequestLogFilePath { get; set; } // Optional request log file path if request logging is enabled
    public bool EnableResponseLogging { get; set; } = false; // Default to not enabling response logging
    public string? ResponseLogFilePath { get; set; } // Optional response log file path if response logging is enabled
    public bool UseDefaultTimeout { get; set; } = true; // Default to using default timeout for requests
    public TimeSpan DefaultTimeout { get; set; } = TimeSpan.FromSeconds(30); // Default timeout for requests
    public bool EnableCircuitBreaker { get; set; } = false; // Default to not enabling circuit breaker
    public int CircuitBreakerThreshold { get; set; } = 5; // Default threshold for circuit breaker
    public TimeSpan CircuitBreakerDuration { get; set; } = TimeSpan.FromMinutes(1); // Default duration for circuit breaker
    public bool EnableHealthChecks { get; set; } = false; // Default to not enabling health checks
    public string? HealthCheckEndpoint { get; set; } // Optional endpoint for health checks
    public bool EnableMetrics { get; set; } = false; // Default to not enabling metrics
    public string? MetricsEndpoint { get; set; } // Optional endpoint for metrics
    public bool EnableTracing { get; set; } = false; // Default to not enabling tracing
    public string? TracingEndpoint { get; set; } // Optional endpoint for tracing
    public bool EnableAuthentication { get; set; } = false; // Default to not enabling authentication
    public string? AuthenticationToken { get; set; } // Optional authentication token for requests
    public bool EnableAuthorization { get; set; } = false; // Default to not enabling authorization
    public string? AuthorizationScheme { get; set; } // Optional authorization scheme (e.g., "Bearer", "Basic")
    public string? AuthorizationToken { get; set; } // Optional authorization token for requests
    public bool EnableCompression { get; set; } = false; // Default to not enabling compression
    public string? CompressionAlgorithm { get; set; } // Optional compression algorithm (e.g., "gzip", "deflate")
    public bool EnableCustomQueryParameters { get; set; } = false; // Default to not enabling custom query parameters
    public Dictionary<string, string>? CustomQueryParameters { get; set; } // Optional custom query parameters for requests
    public bool EnableCustomRequestBody { get; set; } = false; // Default to not enabling custom request body
    public string? CustomRequestBody { get; set; } // Optional custom request body for requests
    public bool EnableCustomResponseHandling { get; set; } = false; // Default to not enabling custom response handling
    public Func<string, Task<string>>? CustomResponseHandler { get; set; } // Optional custom response handler function
    public bool EnableCustomErrorHandling { get; set; } = false; // Default to not enabling custom error handling
    public Func<Exception, Task> CustomErrorHandler { get; set; } = null!; // Optional custom error handler function
    public bool EnableCustomLogging { get; set; } = false; // Default to not enabling custom logging
    public Func<string, Task> CustomLogger { get; set; } = null!; // Optional custom logger function
    */

    public static TokenPVEClientServiceOptions Create(string tokenId, string secret, string host, int? port = 8006, bool? validateServerCertificate = true, int? timeout = 30, string? proxyBaseUrl = null)
    {
        return new TokenPVEClientServiceOptions()
        {
            Host = host,
            Port = port ?? 8006,
            ProxyBaseUrl = proxyBaseUrl,
            AuthenticationScheme = TokenPVEClientServiceOptions.DefaultPVEAuthScheme,
            TokenId = tokenId,
            Secret = secret,
            ValidateServerCertificate = validateServerCertificate ?? true,
            Timeout = timeout
        };
    }

    //public IPVEClientService _CreatePVEClient()
    //{
    //    var urlBuilder = ProxyBaseUrl == null ? new UriBuilder
    //    {
    //        Scheme = "https",
    //        Host = Host,
    //        Port = Port,
    //        Path = "/api2/json/"
    //    }
    //    : new UriBuilder(ProxyBaseUrl.TrimEnd('/') + "/api2/json/");

    //    // var uri = new Uri(BaseUrl.TrimEnd('/') + "/");
    //    // TODO: Validate that the URI Host matches the expected IP Address or hostname from the mdcEndpoint

    //    var handler = new HttpClientHandler();
    //    if (!ValidateServerCertificate)
    //    {
    //        handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true;
    //    }
    //    var httpClient = new HttpClient(handler);
    //    httpClient.BaseAddress = urlBuilder.Uri;
    //    httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(AuthenticationScheme, $"{TokenId}={Secret}");
    //    if (ProxyBaseUrl != null)
    //    {
    //        httpClient.DefaultRequestHeaders.Add("X-Proxmox-Host", Host.ToString());
    //        httpClient.DefaultRequestHeaders.Add("X-Proxmox-Port", Port.ToString());
    //    }
    //    httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    //    if (Timeout.HasValue)
    //    {
    //        httpClient.Timeout = TimeSpan.FromSeconds(Timeout.Value);
    //    }

    //    return new PVEClientService(httpClient);
    //}
}
