using MDC.Core.Services.Providers.PVEClient;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Net.WebSockets;

namespace MDC.Api.Controllers;

/// <summary>
/// Provides API endpoints for establishing and relaying WebSocket connections to virtual machine consoles within a
/// Workspace, enabling real-time browser-based access to Proxmox VNC sessions.
/// </summary>
/// <remarks>This controller requires authenticated access and is intended for use with WebSocket clients. It
/// facilitates secure, proxied access to VM consoles, allowing users to interact with virtual machines directly from
/// their browsers. All endpoints are protected and require valid authorization.</remarks>
/// <param name="workspaceService">The service used to manage Workspace operations and initialize VNC sessions for virtual machines.</param>
/// <param name="vncRelay">The relay responsible for handling bidirectional communication between the browser WebSocket and the Proxmox VNC
/// session.</param>
/// <param name="logger">The logger used to record diagnostic and operational information for the controller.</param>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class VNCController(IWorkspaceService workspaceService, IVNCRelay vncRelay, ILogger<VNCController> logger) : ControllerBase
{
    /// <summary>
    /// Open a WebSocket connection to the console of the VM associated with the specified Workspace. The connection is proxied to the Proxmox VNC session for the VM, allowing real-time interaction with the VM's console through the browser. The 'vmid' parameter is used to specify a particular VM associated with the Workspace. This endpoint requires an active WebSocket connection and will return a 400 Bad Request if accessed via a standard HTTP request.
    /// </summary>
    /// <param name="key"></param>
    /// <param name="vmid"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    [HttpGet("Workspaces({key})/VirtualMachineConsole({vmid})")]
    public async Task GetVirtualMachineConsoleAsync([FromRoute] Guid key, int vmid, CancellationToken cancellationToken = default)
    {
        if (!HttpContext.WebSockets.IsWebSocketRequest)
        {
            HttpContext.Response.StatusCode = 400;
            return;
        }

        logger.LogDebug("Creating Console Websocket for Workspace '{key}' Virtual Machine '{vmid}' .", key, vmid);

        using var proxmoxSocket = await workspaceService.InitializeVNCSessionAsync(key, vmid, cancellationToken);

        // Accept the browser websocket connection after the proxmox connection is established in case of failure
        using var browserSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();

        await vncRelay.HandleSessionAsync(browserSocket, proxmoxSocket, cancellationToken);

        if (browserSocket.State == WebSocketState.Open)
        {
            await browserSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "", cancellationToken);
        }
    }
}