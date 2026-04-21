using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEQemuConfigStorage
{
    public required string ControllerType { get; set; }
    public required int ControllerIndex { get; set; }
    public required string StorageId { get; set; }
    public required string? VolumeId { get; set; }
    public required Dictionary<string, string?> OtherParameters { get; set; }

    public long? GetSize()
    {
        var diskSize = OtherParameters.GetValueOrDefault("size", null);
        if (diskSize == null) return null;

        // Define units and their corresponding byte values. Using 1024 for powers of 2.
        const long KB = 1024; // Kilobyte
        const long MB = KB * 1024; // Megabyte
        const long GB = MB * 1024; // Gigabyte
        const long TB = GB * 1024; // Terabyte

        Match match = Regex.Match(diskSize, @"^(\d+(\.\d+)?)\s*(B|K|M|G|T)$", RegexOptions.IgnoreCase);
        if (!match.Success)
        {
            throw new ArgumentException("Invalid disk size format. Expected format (examples): '10B', '500M', '50G', '2.5T'");
        }

        double value = double.Parse(match.Groups[1].Value); // Extract numeric value
        string unit = match.Groups[3].Value.ToUpper(); // Extract and normalize unit (KB, MB, GB, TB)

        switch (unit)
        {
            case "B":
                return (long)value;
            case "K":
                return (long)(value * KB);
            case "M":
                return (long)(value * MB);
            case "G":
                return (long)(value * GB);
            case "T":
                return (long)(value * TB);
            default: // Should not be reached due to regex matching
                throw new ArgumentException("Invalid disk size unit.");
        }
    }

}
