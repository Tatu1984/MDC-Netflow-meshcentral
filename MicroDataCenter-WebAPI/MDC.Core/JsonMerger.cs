using System.Text.Json;
using System.Text.Json.Nodes;

namespace MDC.Core;

internal static class JsonMerger
{
    public static JsonElement Merge(JsonElement original, JsonElement delta)
    {
        // Convert original to mutable JsonObject
        var originalNode = JsonNode.Parse(original.GetRawText()) ?? new JsonObject();
        var deltaNode = JsonNode.Parse(delta.GetRawText()) ?? new JsonObject();

        MergeNodes(originalNode, deltaNode);

        var mergedJson = originalNode.ToJsonString();
        using var doc = JsonDocument.Parse(mergedJson);
        return doc.RootElement.Clone();
    }

    public static void MergeNodes(JsonNode original, JsonNode delta)
    {
        if (original is not JsonObject origObj || delta is not JsonObject deltaObj)
            throw new InvalidOperationException("Both original and delta must be JSON objects.");

        foreach (var kvp in deltaObj)
        {
            string propName = kvp.Key;
            JsonNode? deltaValue = kvp.Value;

            if (deltaValue is JsonArray deltaArray)
            {
                if (origObj[propName] is not JsonArray origArray)
                    throw new InvalidOperationException($"Property '{propName}' must be an array in the original.");

                MergeArray(origArray, deltaArray);
            }
            else if (deltaValue is JsonObject deltaChildObj)
            {
                if (origObj[propName] is JsonObject origChildObj)
                {
                    MergeNodes(origChildObj, deltaChildObj);
                }
                else
                {
                    origObj[propName] = deltaChildObj.DeepClone();
                }
            }
            else
            {
                // Primitive or null
                origObj[propName] = deltaValue?.DeepClone();
            }
        }
    }

    private static void MergeArray(JsonArray original, JsonArray delta)
    {
        foreach (var deltaItemNode in delta)
        {
            if (deltaItemNode is not JsonObject deltaItem)
                throw new InvalidOperationException("Array items must be JSON objects.");

            string? operation = deltaItem["operation"]?.GetValue<string>();
            string? name = deltaItem["name"]?.GetValue<string>();

            // Name must be provided for all operations
            if (string.IsNullOrEmpty(name))
                throw new InvalidOperationException("Array item must have a 'name' property.");

            // Validate required id for remove/update
            if ((operation == "remove" || operation == "update") && string.IsNullOrEmpty(name))
                throw new InvalidOperationException($"Array item with operation '{operation}' must have an 'name'.");

            // Find target item in original array
            var target = FindArrayItemByName(original, name!);

            // When the target does not exist set default operation to add
            if (target == null)
            {
                operation ??= "add";
            }

            // Apply operation
            if (operation == "add")
            {
                // Prevent adding duplicates
                if (target != null)
                    throw new InvalidOperationException($"Cannot add item with name '{name}' because it already exists.");

                deltaItem["operation"] = operation;
                original.Add(deltaItem.DeepClone());
                return;
            }

            // update/remove
            if (target == null)
            {
                if (operation == "remove")
                    continue; // Nothing to remove, skip

                throw new InvalidOperationException($"Cannot update item with name '{name}' because it does not exist.");
            }

            // Apply properties from delta to target
            foreach (var kvp in deltaItem)
            {
                target[kvp.Key] = kvp.Value?.DeepClone();
            }

            // Ensure operation is set
            target["operation"] = operation;
            
        }
    }

    private static JsonObject? FindArrayItemByName(JsonArray array, string name)
    {
        foreach (var node in array)
        {
            if (node is JsonObject obj && obj["name"]?.GetValue<string>() == name)
                return obj;
        }
        return null;
    }
}
