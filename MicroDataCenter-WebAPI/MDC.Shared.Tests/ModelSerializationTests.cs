using AutoFixture;
using AutoFixture.Kernel;
using MDC.Shared.Models;
using System.Reflection;
using System.Text.Json;
using Xunit.Sdk;

namespace MDC.Shared.Tests
{
    public class ModelSerializationTests
    {
        private static readonly Assembly ModelAssembly =  typeof(MDC.Shared.Models.WorkspaceDescriptor).Assembly;

        // Discover all relevant model types
        public static IEnumerable<object[]> GetModelTypes()
        {
            return ModelAssembly.GetTypes()
                .Where(t => t.IsClass &&
                            !t.IsAbstract &&
                            !t.IsGenericType &&
                            !t.Implements(typeof(IDisposable)) &&
                            t.Namespace == "MDC.Shared.Models")
                .Select(t => new object[] { t });
        }

        [Theory]
        [MemberData(nameof(GetModelTypes))]
        public void Model_Is_Serializable(Type modelType)
        {
            var fixture = new Fixture();
            fixture.Behaviors.OfType<ThrowingRecursionBehavior>().ToList().ForEach(b => fixture.Behaviors.Remove(b));
            fixture.Behaviors.Add(new OmitOnRecursionBehavior());

            try
            {
                var instance = fixture.Create(modelType, new SpecimenContext(fixture));
                var json = JsonSerializer.Serialize(instance);

                Assert.False(string.IsNullOrWhiteSpace(json), $"Serialization returned empty for {modelType.FullName}");
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to serialize {modelType.FullName}: {ex.Message}", ex);
            }
        }

        [Theory]
        [MemberData(nameof(GetModelTypes))]
        public void Model_Is_Deserializable(Type modelType)
        {
            var fixture = new Fixture();
            fixture.Behaviors.OfType<ThrowingRecursionBehavior>().ToList().ForEach(b => fixture.Behaviors.Remove(b));
            fixture.Behaviors.Add(new OmitOnRecursionBehavior());

            //fixture.Register<IQueryable<Workspace>>(() => fixture.CreateMany<Workspace>().AsQueryable());
            //fixture.Register<IQueryable<VirtualNetwork>>(() => fixture.CreateMany<VirtualNetwork>().AsQueryable());


            fixture.Customizations.Add(
                new TypeRelay(
                    typeof(System.Linq.IQueryable<MDC.Shared.Models.Workspace>),
                    typeof(List<Workspace>)));

            try
            {
                var original = fixture.Create(modelType, new SpecimenContext(fixture));
                var json = JsonSerializer.Serialize(original);
                var deserialized = JsonSerializer.Deserialize(json, modelType);

                Assert.NotNull(deserialized);
                Assert.IsType(modelType, deserialized);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to deserialize {modelType.FullName}: {ex.Message}", ex);
            }
        }
    }
}
