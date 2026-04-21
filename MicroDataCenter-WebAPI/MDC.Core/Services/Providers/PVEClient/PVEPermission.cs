using System.Text.Json.Serialization;

namespace MDC.Core.Services.Providers.PVEClient;

internal class PVEPermission
{
    public required string Type { get; set; }

    public required string Path { get; set; }

    public required string RoleId { get; set; }

    [JsonPropertyName("ugid")]
    public required string UserGroupId { get; set; }

    public required int Propagate { get; set; }

}
