namespace MDC.Shared.Models;

/// <summary/>
public class RunCommandResponse
{
    /// <summary/>
    public string? Output { get; set; }

    /// <summary/>
    public required int ExitCode { get; set; }

    /// <summary/>
    public string? ErrorMessage { get; set; }
    
    /// <summary/>
    public required TimeSpan Elapsed { get; set; }
}
