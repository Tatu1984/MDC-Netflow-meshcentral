using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Models;

internal class VirtualNetworkEntry : ResourceEntry
{
    public required int? Tag { get; set; }

    public required DbVirtualNetwork? DbVirtualNetwork { get; set; } = null;
}
