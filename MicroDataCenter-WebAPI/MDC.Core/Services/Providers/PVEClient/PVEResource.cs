using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEResource
{
    public required string Id { get; set; }
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required PVEResourceType Type { get; set; }
    public string? Name { get; set; }

    // Used for types qemu and lxc
    public string? Tags { get; set; }
    public string? Node { get; set; }
    [JsonConverter(typeof(JsonIntBoolConverter))]
    public bool? Template { get; set; }
    [JsonPropertyName("vmid")]
    public int? VmId { get; set; } // For Qemu and Lxc resources
    
    // Used for types node, qemu, and lxc
    [JsonPropertyName("maxmem")]
    public long? MaxMem { get; set; }
    [JsonPropertyName("mem")]
    public long? Mem { get; set; }

    // Used for types node, qemu, and lxc (reported as a fraction 0..1)
    [JsonPropertyName("cpu")]
    public double? Cpu { get; set; }
    [JsonPropertyName("maxcpu")]
    public int? MaxCpu { get; set; }

    // Used for type node
    public string? Status { get; set; }
    [JsonPropertyName("uptime")]
    public long? Uptime { get; set; }

    // Used for type storage (whether the storage is online)
    [JsonPropertyName("plugintype")]
    public string? PluginType { get; set; }

    // Used for type storage
    public string? Content { get; set; }

    // Used for type storage (storage size).
    // Used for types qemu, lxc (root image size for VMs)
    [JsonPropertyName("maxdisk")]
    public long? MaxDisk { get; set; }

    // Used for type storage (storage used).
    // Used for types qemu, lxc (root image used for VMs)
    [JsonPropertyName("disk")]
    public long? Disk{ get; set; }

}

internal enum PVEResourceType
{
    Node,
    Storage,
    Pool,
    Qemu,
    Lxc,
    Openvz,
    Sdn,
    Pbs,
    Network
}
