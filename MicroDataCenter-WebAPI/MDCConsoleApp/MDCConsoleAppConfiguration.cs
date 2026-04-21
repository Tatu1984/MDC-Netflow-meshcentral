using System;
using System.Collections.Generic;
using System.Text;

namespace MDCConsoleApp;

internal class MDCConsoleAppConfiguration
{
    public required string ClientId { get; set; }

    public required string ClientSecret { get; set; }

    public required string[] Scopes { get; set; }

    public required string TenantId { get; set; }

    public required string Authority { get; set; }
}
