using MDC.Core.Services.Providers.PVEClient;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Tests.Services.Providers.PVEClient;

public class PVEClientServiceTests
{
    public class SerializableResourceFiles : TheoryData<Type, string>
    {
        public SerializableResourceFiles()
        {
            string root = Path.Combine("Services", "Providers", "PVEClient", "Responses", "MultiNode");

            Add(typeof(PVEResponse<IEnumerable<PVEClusterStatus>>), Path.Combine(root, "GetClusterStatus.json"));
            Add(typeof(PVEResponse<IEnumerable<PVEResource>>), Path.Combine(root, "GetClusterResources.json"));
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
