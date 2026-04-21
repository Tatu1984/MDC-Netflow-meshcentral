using MDC.Core.Services.Providers.PVEClient;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Net.WebSockets;
using System.Text.Json.Nodes;

namespace MDC.Api.Controllers;

/*
 * When creating the Proxmox install ISO, run the following command
 proxmox-auto-install-assistant prepare-iso ./proxmox-ve_9.1-1_autoinstall.iso --fetch-from http --url "https://10.10.72.84:7078/api/ZTP/register" --cert-fingerprint "f8:eb:30:bb:c0:41:49:6b:2f:63:53:ad:6f:b6:e6:55:63:4d:c7:59:8b:2a:46:9c:d6:e7:87:02:49:58:ef:45"
 */

/// <summary>
/// 
/// </summary>
/// <param name="siteNodeRegistrationService"></param>
/// <param name="logger"></param>
[ApiController]
[Authorize(AuthenticationSchemes = "ApiKey", Policy = "DeviceRegistration")]
[Route("api/[controller]")]
public class ZTPController(ISiteNodeRegistrationService siteNodeRegistrationService, ILogger<ZTPController> logger) : ControllerBase
{
    /*
     * 1. Register => Create Site Registration Entry, with an apiKey which will be used for the rest of this registration process
     * 2. GetFirstBootScript
     * 3. NotifyAutoInstallation
     * 4. NotifyFirstBootComplete
     */

    /// <summary>
    /// 
    /// </summary>
    /// <param name="systemInformation"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterAsync([FromBody] JsonNode systemInformation, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Request AutoInstallation AnswersFile with System-Information: {@systemInformation}", systemInformation);
        var answerFile = await siteNodeRegistrationService.RequestAutoInstallationAsync(systemInformation, cancellationToken);
        logger.LogInformation("Auto Installation Response: {@answerFile}", answerFile);
        return Ok(answerFile);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="uuid"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    [HttpGet("firstboot/{uuid}")]
    public async Task<IActionResult> GetFirstBootScriptAsync([FromRoute]Guid uuid, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Request AutoInstallation First-Boot-Script for {uuid}", uuid);
        var answerFile = await siteNodeRegistrationService.GetFirstBootScriptAsync(uuid, cancellationToken);
        logger.LogInformation("First-Boot Script for {uuid}: \r\n{@answerFile}", uuid, answerFile);
        return Ok(answerFile);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="uuid"></param>
    /// <param name="deviceInformation"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    [HttpPost("notify/{uuid}")]
    public async Task<IActionResult> NotifyAutoInstallationAsync([FromRoute] Guid uuid, [FromBody] JsonNode deviceInformation, CancellationToken cancellationToken = default)
    {
        // NotifyAutoInstallationAsync will be called by the Proxmox Auto Installation Assistant during the post-installation phase of the Proxmox VE installation.
        // The device information sent by the assistant can be used to perform any necessary configuration or setup after the installation is complete.
        logger.LogInformation("Register AutoInstallation Device-Information for {uuid}: {@deviceInformation}", uuid, deviceInformation);
        await siteNodeRegistrationService.NotifyAutoInstallationAsync(uuid, deviceInformation, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="uuid"></param>
    /// <param name="firstBootInformation"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    [HttpPost("firstboot/{uuid}")]
    public async Task<IActionResult> NotifyFirstBootCompleteAsync([FromRoute] Guid uuid, [FromBody] JsonNode firstBootInformation, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Register AutoInstallation Complete for {uuid} with First-Boot-Information: {@firstBootInformation}", uuid, firstBootInformation);
        await siteNodeRegistrationService.CompleteFirstBootAsync(uuid, firstBootInformation, cancellationToken);
        return NoContent();
    }
}