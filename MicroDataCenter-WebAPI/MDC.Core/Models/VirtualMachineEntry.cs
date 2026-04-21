using MDC.Core.Services.Providers.PVEClient;
using MDC.Core.Services.Providers.ZeroTier;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Models;

internal class VirtualMachineEntry : ResourceEntry
{
    public ZTNodeConfig? ZTNodeConfig { get; set; }

    public ZTNetworkMembership? ZTNetworkMembership { get; set; }

    public PVEQemuAgentNetworkInterface[]? PVEQemuAgentNetworkInterfaces { get; set; } = null;

    public VirtualMachineDescriptor? VirtualMachineDescriptor { get; set; } = null;
}
