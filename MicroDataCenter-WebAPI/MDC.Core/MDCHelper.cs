using MDC.Core.Services.Providers.MDCDatabase;
using MDC.Core.Services.Providers.PVEClient;
using System.Linq.Expressions;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MDC.Core;

internal static class MDCHelper
{
    public static class MDCResourceType
    {
        public const string VirtualMachine = "VM";
        public const string Gateway = "GW";
    }

    public static string[] MDCResourceTypes => new[]
    {
        MDCResourceType.VirtualMachine,
        MDCResourceType.Gateway
    };

    public static string FormatVirtualMachineName(int workspaceAddress, string type, int index, string name) => !MDCResourceTypes.Contains(type) ? throw new ArgumentException(nameof(type))
        : $"{workspaceAddress:d4}{type}{index:d2}.{name}";

    public static string FormatZeroTierNetworkName(string clusterName, int workspaceAddress, int index) => $"{clusterName}.{workspaceAddress:d4}.{index:d2}";

    public static bool ParseMDCVirtualMachineName(string? resourceName, bool isTemplate, out int? workspaceAddress, out string? type, out int? index, out string? name)
    {
        workspaceAddress = null;
        type = null;
        index = null;
        name = null;

        // MDC Resources Qemu virtual machine name is expected to have a specific format: <prefix>.<name>
        // Where <prefix> split into two parts for a template and 3 parts for a Virtual Machine.
        // When the resource is not a template, the prefix begins with 4 digits for the Workspace Address.  The remaining characters are the two characters representing the resource type, and optionally followed by an digits for the resource Index.

        var parts = resourceName?.Split('.');
        if (parts?.Length != 2)
            return false;

        string prefix = parts[0];
        int? __workspaceAddress = null;
        if (!isTemplate)
        {
            if (!int.TryParse(parts[0].Substring(0, 4), out int _workspaceAddress))
            {
                return false; // The first part must be a valid 4-digit workspace address
            }
            __workspaceAddress = _workspaceAddress;
            prefix = prefix.Substring(4); // Remove the workspace address from the prefix
        }

        string __resourceType = prefix.Substring(0, 2); // Get next two characters as the resource type
        if (!MDCResourceTypes.Contains(__resourceType))
            return false;
        prefix = prefix.Substring(2); // Remove the resource type from the prefix

        int __resourceIndex = 0;
        if (!int.TryParse(prefix, out int _resourceIndex))
        {
            if (string.IsNullOrEmpty(prefix))
            {
                __resourceIndex = 0; // If no index is provided, default to 0
            }
            else
            {
                return false; // If the prefix is not empty and not a valid number, return false
            }
        }
        else
        {
            __resourceIndex = _resourceIndex; // Set the resource index if it is a valid number
        }

        workspaceAddress = __workspaceAddress;
        type = __resourceType;
        index = __resourceIndex;
        name = parts[1]; // The second part is the resource name
        return true;
    }

    public static bool GetMDCTemplateForResource(PVEResource resource, IEnumerable<PVEResource> allResources, out PVEResource? templateResource, out string? templateName, out int? templateRevision)
    {
        templateResource = null;
        templateName = null;
        templateRevision = null;

        var tags = resource.GetTags();
        if (!(tags.TryGetValue("template_vmid", out var vmidStr) && int.TryParse(vmidStr, out var templateVMID)))
            return false;
        templateResource = allResources.FirstOrDefault(i => i.Template == true && i.GetTags().GetValueOrDefault("template_vmid") == templateVMID.ToString());
        if (templateResource == null)
            return false;

        return templateResource.ParseMDCResource(out var _, out var _, out var _, out templateRevision, out templateName);
    }

    public static T Patch<T>(T descriptor, JsonNode delta)

    {
        var original = JsonSerializer.SerializeToNode(descriptor, JsonSerializerOptions.Web) ?? throw new InvalidOperationException("Failed to serialize the original object.");

        JsonMerger.MergeNodes(original, delta);

        // Deserialize back to the original object
        descriptor = original.Deserialize<T>(JsonSerializerOptions.Web) ?? descriptor;
        return descriptor;
    }
}
