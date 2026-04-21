using System.Net.WebSockets;

namespace MDC.Core.Services.Providers.PVEClient;

/// <summary/>
public interface IVNCRelay
{
    /// <summary/>
    Task HandleSessionAsync(WebSocket browserSocket, VNCSession vNCSession, CancellationToken cancellationToken = default);
}
