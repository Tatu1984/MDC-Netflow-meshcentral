using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace MDC.Api.Services;

/*
 * Swagger/Scalar/OpenAPI — the generators don’t know how to infer the schema of Delta<T>, so they default to showing the raw Delta<T> structure rather than the underlying T.
 */

/// <summary>
/// 
/// </summary>
/// <typeparam name="T"></typeparam>
public class DeltaSchemaFilter<T> : ISchemaFilter
{
    /// <summary>
    /// 
    /// </summary>
    /// <param name="schema"></param>
    /// <param name="context"></param>
    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type.IsGenericType && context.Type.GetGenericTypeDefinition() == typeof(Delta<>))
        {
            var underlyingType = context.Type.GetGenericArguments()[0];
            var genSchema = context.SchemaGenerator.GenerateSchema(underlyingType, context.SchemaRepository);
            schema.Properties = genSchema.Properties;
            schema.Required = genSchema.Required;
            schema.Type = genSchema.Type;
            schema.Reference = genSchema.Reference;
        }
    }
}
