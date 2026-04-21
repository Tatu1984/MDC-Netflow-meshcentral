using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.ZeroTier;

internal class ZTControllerStatus
{
    public required bool Controller { get;set; }
    public required int ApiVersion { get;set; }
    public required long Clock { get;set; }
}
