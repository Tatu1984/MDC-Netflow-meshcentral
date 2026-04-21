using MDC.Core.Services.Providers.PVEClient;

namespace MDC.Core.Extensions;

internal static class PVEQemuConfigExtensions
{
    public static IEnumerable<PVEQemuConfigNetworkAdapter> ParseNetworkAdapters(this PVEQemuConfig config)
    {
        List<PVEQemuConfigNetworkAdapter> networkAdapters = new List<PVEQemuConfigNetworkAdapter>();
        foreach (var entry in config.UnknownProperties)
        {
            if (entry.Value.ValueKind != System.Text.Json.JsonValueKind.String || !entry.Key.StartsWith("net")) continue; // Not a network device

            if (!int.TryParse(entry.Key.Substring(3), out int deviceIndex)) continue;   // Not a valid device ID
          
            var adapter = new PVEQemuConfigNetworkAdapter
            {
                DeviceId = entry.Key,
                DeviceIndex = deviceIndex
            };

            foreach (var segment in (entry.Value.GetString() ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = segment.Split('=', StringSplitOptions.RemoveEmptyEntries);
                switch (parts[0])
                {
                    case "virtio":
                    case "e1000":
                    case "rtl8139":
                    case "ne2k_pci":
                    case "vmxnet3":
                        // Valid network device models
                        adapter.Model = parts[0];
                        adapter.MACAddress = parts.ElementAtOrDefault(1);
                        break;
                    case "bridge":
                        adapter.Bridge = parts.ElementAtOrDefault(1); break;
                    case "firewall":
                        adapter.IsFirewallEnabled = parts.ElementAtOrDefault(1) == "1"; break;
                    case "tag":
                        adapter.Tag = int.TryParse(parts.ElementAtOrDefault(1), out int _tag) ? _tag : null; break;
                    case "link_down":
                        adapter.IsDisconnected = parts.ElementAtOrDefault(1) == "1"; break;
                    default:
                        // Unknown parameter
                        break;
                }
            }
            networkAdapters.Add(adapter);
            
        }
        return networkAdapters;
    }

    public static (PVEQemuConfigNetworkAdapter? WanNetworkAdapter, PVEQemuConfigNetworkAdapter LanNetworkAdapter) ParseGatewayNetworkAdapters(this PVEQemuConfig config)
    {
        // TODO: Support multiple WAN or LAN interfaces by having multiple tags with same prefix
        var tags = config.GetTags();
        if (!tags.TryGetValue("gw_lan_networkinterface", out var lanNetworkInterfaceAdapterId))
            lanNetworkInterfaceAdapterId = "net1";

        var networkInterfaces = config.ParseNetworkAdapters();
        var lanNetworkInterface = networkInterfaces.FirstOrDefault(i => i.DeviceId == lanNetworkInterfaceAdapterId);
        var wanNetworkInterface = networkInterfaces.FirstOrDefault(i => i.DeviceId != lanNetworkInterfaceAdapterId);

        if (lanNetworkInterface == null)
        {
            if (MDCHelper.ParseMDCVirtualMachineName(config.Name, false, out var workspaceAddres, out var type, out var index, out var name))
                throw new InvalidOperationException($"Workspace '{workspaceAddres}' Gateway Virtual Machine '{name}' is expecting Network Interface '{lanNetworkInterfaceAdapterId}' for LAN interface.");
            throw new InvalidOperationException($"Workspace Gateway Virtual Machine '{config.Name}' is expecting Network Interface '{lanNetworkInterfaceAdapterId}' for LAN interface.");
        }

        //if (lanNetworkInterface.Tag == null || lanNetworkInterface.Tag.Value < minWorkspaceAddress)   // TODO: Get the minimum tag value from Datacenter Settings
        //    throw new InvalidOperationException($"Workspace '{workspaceEntry.Address}' Gateway Virtual Machine '{virtualNetworkEntry.PVEResource!.Name}' Network Interface '{lanNetworkInterface.DeviceId}' has invalid Tag value '{Convert.ToString(lanNetworkInterface.Tag) ?? "<none>"}'.");

        return (wanNetworkInterface, lanNetworkInterface);
    }

    public static string[] PVEStorageControllerTypes => new[]
    {
        "ide",
        "sata",
        "scsi",
        "virtio"
    };

    public static IEnumerable<PVEQemuConfigStorage> ParseStorage(this PVEQemuConfig config)
    {
        List<PVEQemuConfigStorage> storages = new List<PVEQemuConfigStorage>();
        foreach (var entry in config.UnknownProperties.Where(entry => entry.Value.ValueKind == System.Text.Json.JsonValueKind.String))
        {
            var controllerType = PVEStorageControllerTypes.FirstOrDefault(i => entry.Key.StartsWith(i));
            if (controllerType == null) continue;   // Not a storage entry

            if (!int.TryParse(entry.Key.Substring(controllerType.Length), out var controllerIndex)) continue; // Is not a storage controller

            var segments = entry.Value.GetString()?.Split(",", StringSplitOptions.RemoveEmptyEntries) ?? [];
            var volume = segments[0];
            var volumeParts = volume.Split(":");
            var storage_id = volumeParts[0];
            var volume_id = volumeParts.ElementAtOrDefault(1);

            var parameters = segments
                .Skip(0)
                .Select(i => i.Split("=", StringSplitOptions.RemoveEmptyEntries))
                .ToDictionary(i => i[0], i => i.ElementAtOrDefault(1));

            storages.Add(new PVEQemuConfigStorage
            {
                ControllerType = controllerType,
                ControllerIndex = controllerIndex,
                StorageId = storage_id,
                VolumeId = volume_id,
                OtherParameters = parameters
            });
        }

        return storages;
    }

    public static Dictionary<string, string?> GetTags(this PVEQemuConfig config)
    {
        return (config.Tags ?? string.Empty)
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('.', 2, StringSplitOptions.RemoveEmptyEntries))
            .ToDictionary(parts => parts[0].Trim(), parts => parts.ElementAtOrDefault(1)?.Trim());
    }
}
