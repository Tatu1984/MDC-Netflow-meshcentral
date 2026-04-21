namespace MDC.Core.Services.Providers.PVEClient;

internal class QemuAgentExecResult
{
    public required string Command { get; set; }

    public string? Output { get; set; }

    public int ExitCode { get; set; }

    public string? ErrorMessage { get; set; }

    public required TimeSpan Elapsed { get; set; }
}
