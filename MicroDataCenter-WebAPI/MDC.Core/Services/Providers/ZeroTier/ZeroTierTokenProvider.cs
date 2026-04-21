using Microsoft.Extensions.Options;
using System.Net.Http.Json;

namespace MDC.Core.Services.Providers.ZeroTier;

internal interface IZeroTierTokenProvider
{
    Task<string> GetTokenAsync(CancellationToken cancellationToken);
}

internal class ZeroTierTokenProvider(HttpClient httpClient, IOptions<ZeroTierServiceOptions> options) : IZeroTierTokenProvider
{
    private readonly ZeroTierServiceOptions _options = options.Value;
    private string _token = string.Empty;
    // private DateTime _expiresAt;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public async Task<string> GetTokenAsync(CancellationToken cancellationToken)
    {
        if (!IsTokenExpired())
            return _token;

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (!IsTokenExpired())
                return _token;
            UriBuilder authUrlBuilder = new(_options.BaseUrl)
            {
                Path = "auth/login"
            };
            var response = await httpClient.PostAsJsonAsync(authUrlBuilder.Uri, new
            {
                username = _options.Username,
                password = _options.Password
            }, cancellationToken);

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<ZeroTierAuthResponse>(cancellationToken);

            _token = result?.Token ?? string.Empty;
            // _expiresAt = DateTime.UtcNow.AddSeconds(result.ExpiresIn - 60); // refresh 1 min early
        }
        finally
        {
            _lock.Release();
        }

        return _token;
    }

    private bool IsTokenExpired() => string.IsNullOrEmpty(_token); // || DateTime.UtcNow >= _expiresAt;
}

internal class ZeroTierAuthResponse
{
    public required string Token { get; set; }
}
