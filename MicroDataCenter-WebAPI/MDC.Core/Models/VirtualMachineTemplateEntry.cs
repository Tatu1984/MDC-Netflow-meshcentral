using MDC.Core.Services.Providers.PVEClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Models;

internal class VirtualMachineTemplateEntry : ResourceEntry
{
    public required string ResourceType { get; set; }

    public IEnumerable<PVEQemuConfigStorage>? Storage { get; set; } = null;
}
