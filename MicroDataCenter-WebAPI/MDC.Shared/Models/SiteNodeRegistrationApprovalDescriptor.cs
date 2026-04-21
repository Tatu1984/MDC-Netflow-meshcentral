using System;
using System.Collections.Generic;
using System.Text;

namespace MDC.Shared.Models;

/// <summary />
public class SiteNodeRegistrationApprovalDescriptor
{
    /// <summary />
    public bool? DataEgressOnMgmtNetwork { get; set; }

    /// <summary />
    public bool? SkipNetworkConfiguration { get; set; }
}
