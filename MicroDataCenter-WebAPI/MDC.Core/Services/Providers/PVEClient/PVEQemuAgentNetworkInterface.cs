using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEQemuAgentNetworkInterface
{
    public required string Name { get; set; }

    public required string MACAddress { get; set; }

    public required IPAddress? IPAddress { get; set; }

    public required int? Prefix { get; set; }
}
