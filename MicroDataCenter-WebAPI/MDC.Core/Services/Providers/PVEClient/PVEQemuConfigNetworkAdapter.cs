using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEQemuConfigNetworkAdapter
{
    public required string DeviceId { get; set; } // e.g., "net0", "net1", etc.
    public required int DeviceIndex { get; set; }
    public string? Model { get; set; } // e.g., "virtio", "e1000", etc.
    public string? Bridge { get; set; } // e.g., "vmbr0"
    public string? MACAddress { get; set; } // e.g., "00:11:22:33:44:55"
    public int? Tag { get; set; } // e.g., 100
    public bool? IsFirewallEnabled { get; set; }
    public bool? IsDisconnected { get; set; }

    public string ToConfigValue()
    {
        Dictionary<string, string> values = new Dictionary<string, string>();
        if (Bridge != null)
            values.Add("bridge", Bridge);
        if (Tag != null)
            values.Add("tag", Tag.Value.ToString());
        if (IsFirewallEnabled.HasValue)
            values.Add("firewall", IsFirewallEnabled.Value ? "1" : "0");
        if (IsDisconnected.HasValue)
            values.Add("link_down", IsDisconnected.Value ? "1" : "0");
        if (MACAddress != null)
            values.Add("macaddr", MACAddress);
        if (Model != null)
            values.Add("model", Model);
        return string.Join(",", values.Select(i => $"{i.Key}={i.Value}"));
    }
}
