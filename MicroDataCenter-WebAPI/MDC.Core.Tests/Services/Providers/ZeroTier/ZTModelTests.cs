using MDC.Core.Services.Providers.ZeroTier;

namespace MDC.Core.Tests.Services.Providers.ZeroTier;

public class ZTModelTests
{
    public class SerializableResourceFiles : TheoryData<Type, string>
    {
        public SerializableResourceFiles()
        {
            string root = Path.Combine("Services", "Providers", "ZeroTier", "Responses");

            Add(typeof(ZTStatus), Path.Combine(root, "zeroui_controller_status.json"));
            Add(typeof(IEnumerable<ZTNetwork>), Path.Combine(root, "zeroui_api_network.json"));
            Add(typeof(ZTNetwork), Path.Combine(root, "zeroui_api_network_nwid.json"));
            Add(typeof(IEnumerable<ZTMember>), Path.Combine(root, "zeroui_api_network_nwid_member.json"));
            Add(typeof(ZTMember), Path.Combine(root, "zeroui_api_network_nwid_member_mid.json"));
        }
    }

    [Theory]
    [ClassData(typeof(SerializableResourceFiles))]
    public void Response_Objects_Should_Be_Serializable(Type type, string jsonFile)
    {
        Assert.True(File.Exists(jsonFile), $"The file {jsonFile} does not exist.");
        var json = System.IO.File.ReadAllText(jsonFile);
        var value = System.Text.Json.JsonSerializer.Deserialize(json, type, System.Text.Json.JsonSerializerOptions.Web);
        Assert.NotNull(value);
    }
}
