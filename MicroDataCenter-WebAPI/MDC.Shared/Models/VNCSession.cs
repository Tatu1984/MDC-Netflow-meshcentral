using System.Net.WebSockets;
using System.Text.Json.Serialization;

namespace MDC.Shared.Models;

/// <summary />
public class VNCSession : IDisposable
{
    /// <summary />
    public required ClientWebSocket ClientWebSocket { get; set; }

    /// <summary />
    public required string Url { get; set; }

    /// <summary />
    public required string? Password { get; set; }

    /// <summary />
    public void Dispose()
    {
        ClientWebSocket.Dispose();
    }
}
