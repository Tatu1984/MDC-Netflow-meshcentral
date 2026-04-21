using MDC.Core.Services.Providers.MDCEndpoint;
using Microsoft.Extensions.Logging;

namespace MDC.Core.Services.Providers.PVEClient;

internal interface IPVEClientFactory
{
    IPVEClientService Create(MicroDataCenterEndpoint mdcEndpoint);
    IPVEClientService Create(TokenPVEClientServiceOptions options);
    IPVEClientService Create(string ipAddress, int port, bool validateServerCertificate, int? timeout, string? proxyBaseUrl);
}

internal class PVEClientFactory(ILoggerFactory loggerFactory) : IPVEClientFactory
{
    public IPVEClientService Create(MicroDataCenterEndpoint mdcEndpoint)
    {
        if (mdcEndpoint.PVEClientConfiguration == null)
        {
            throw new InvalidOperationException($"PVE Client Configuration is not set for MicroDataCenter endpoint.");
        }
        return Create(mdcEndpoint.PVEClientConfiguration);
    }

    public IPVEClientService Create(TokenPVEClientServiceOptions options)
    {
        var urlBuilder = options.ProxyBaseUrl == null ? new UriBuilder
        {
            Scheme = "https",
            Host = options.Host,
            Port = options.Port,
            Path = "/api2/json/"
        }
        : new UriBuilder(options.ProxyBaseUrl.TrimEnd('/') + "/api2/json/");

        // var uri = new Uri(BaseUrl.TrimEnd('/') + "/");
        // TODO: Validate that the URI Host matches the expected IP Address or hostname from the mdcEndpoint

        var handler = new HttpClientHandler();
        if (!options.ValidateServerCertificate)
        {
            handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true;
        }

        var httpClient = new HttpClient(handler);
        httpClient.BaseAddress = urlBuilder.Uri;
        httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(options.AuthenticationScheme, $"{options.TokenId}={options.Secret}");
        if (options.ProxyBaseUrl != null)
        {
            httpClient.DefaultRequestHeaders.Add("X-Proxmox-Host", options.Host.ToString());
            httpClient.DefaultRequestHeaders.Add("X-Proxmox-Port", options.Port.ToString());
        }
        httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        if (options.Timeout.HasValue)
        {
            httpClient.Timeout = TimeSpan.FromSeconds(options.Timeout.Value);
        }

        return new PVEClientService(httpClient, loggerFactory.CreateLogger<PVEClientService>());
    }

    public IPVEClientService Create(string ipAddress, int port, bool validateServerCertificate, int? timeout, string? proxyBaseUrl)
    {
        var urlBuilder = proxyBaseUrl == null ? new UriBuilder
        {
            Scheme = "https",
            Host = ipAddress,
            Port = port,
            Path = "/api2/json/"
        }
        : new UriBuilder(proxyBaseUrl.TrimEnd('/') + "/api2/json/");

        var handler = new HttpClientHandler();
        if (!validateServerCertificate)
        {
            handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true;
        }
        var httpClient = new HttpClient(handler);
        httpClient.BaseAddress = urlBuilder.Uri;
        if (proxyBaseUrl != null)
        {
            httpClient.DefaultRequestHeaders.Add("X-Proxmox-Host", ipAddress.ToString());
            httpClient.DefaultRequestHeaders.Add("X-Proxmox-Port", port.ToString());
        }
        httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        if (timeout.HasValue)
        {
            httpClient.Timeout = TimeSpan.FromSeconds(timeout.Value);
        }

        return new PVEClientService(httpClient, loggerFactory.CreateLogger<PVEClientService>());
    }
}
