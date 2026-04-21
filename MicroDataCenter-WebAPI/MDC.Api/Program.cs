using Azure.Identity;
using MDC.Api.Services;
using MDC.Api.Services.Authentication;
using MDC.Core.Extensions;
using MDC.Core.Services.Providers.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.OData;
using Microsoft.AspNetCore.OData.Batch;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Graph;
using Microsoft.Identity.Web;
using Microsoft.OData;
using Microsoft.OData.Json;
using Microsoft.OData.Edm;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using System.IO;
using System.Reflection;

namespace MDC.Api
{
    /// <summary>
    /// The entry point of the application. Configures and starts the web application with OData, Swagger/OpenAPI/ScalarUI, and
    /// other services.
    /// </summary>
    /// <remarks>This method initializes the application by setting up services, middleware, and routing. It
    /// configures OData with query features,  batch handling, and case-insensitive routing options. Swagger/OpenAPI is
    /// also configured for API documentation and debugging.  In development environments, additional debugging tools
    /// such as OData route debugging and Swagger UI are enabled.</remarks>
    public class Program
    {
        /// <summary>
        /// The entry point of the application. Configures and starts the web application with OData, Swagger/OpenAPI/ScalarUI,
        /// and other services.
        /// </summary>
        /// <remarks>This method initializes the application by setting up services, middleware, and
        /// routing. It configures OData with query features,  batch handling, and case-insensitive routing options.
        /// Swagger/OpenAPI is also configured for API documentation and exploration.  In development environments,
        /// additional debugging tools such as OData route debugging and Swagger UI are enabled.</remarks>
        /// <param name="args">An array of command-line arguments passed to the application.</param>
        public static async Task Main(string[] args)
        {
            // Learn more about configuring OData at https://learn.microsoft.com/odata/webapi-8/getting-started
            var builder = WebApplication.CreateBuilder(args);
            
            builder.Services.AddMicroDatacenterCore(builder.Configuration);
            builder.Configuration.AddUserSecrets<Program>();

            var apiKeysEnabled = builder.Configuration.GetValue<bool>("API_KEYS_ENABLED", false);

            // Ensure that the logged on user principal is injected into services
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddScoped<ITenantContext, MDCPrincipalAccessor>();

            // Register API Key Authentication services
            builder.Services.AddScoped<IAPIKeyAuthenticationService, APIKeyAuthenticationService>();

            const int maxPageSize = 100;   // Corresponding to the maximum page size for Microsoft Graph Results. See https://learn.microsoft.com/en-us/graph/paging
            var edmModel = EdmModelBuilder.GetEdmModel();
            builder.Services.AddSingleton<IEdmModel>(edmModel);
            
            builder.Services.AddControllers()
                .AddOData(opt =>
                {
                    DefaultODataBatchHandler defaultBatchHandler = new DefaultODataBatchHandler();
                    defaultBatchHandler.MessageQuotas.MaxNestingDepth = 10;
                    defaultBatchHandler.MessageQuotas.MaxOperationsPerChangeset = 1000;
                    defaultBatchHandler.MessageQuotas.MaxReceivedMessageSize = 1048576; // 1 MB

                    opt.AddRouteComponents(
                            routePrefix: "odata",
                            model: edmModel, // EdmModelBuilder.GetEdmModel(),
                            batchHandler: defaultBatchHandler
                            )
                            //configureServices: services =>
                            //{
                            //    services.AddSingleton<IStreamBasedJsonWriterFactory>(_ => DefaultStreamBasedJsonWriterFactory.Default);
                            //})
                        .EnableQueryFeatures(maxPageSize);
                    opt.RouteOptions.EnableControllerNameCaseInsensitive = true;
                    opt.RouteOptions.EnableActionNameCaseInsensitive = true;
                    opt.RouteOptions.EnablePropertyNameCaseInsensitive = true;
                    opt.RouteOptions.EnableNonParenthesisForEmptyParameterFunction = true;
                    opt.Select().OrderBy().Filter().Count().Expand().SetMaxTop(maxPageSize);
                })
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
                    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                });

            // Learn more about configuring Swagger/OpenAPI at https://github.com/OData/AspNetCoreOData/tree/main/sample/ODataRoutingSample
            builder.Services.AddEndpointsApiExplorer();
            
            // Configure Authentication with Azure AD and API Key
            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddMicrosoftIdentityWebApi(options =>
                {
                    builder.Configuration.Bind("AzureAd", options);
                    // For multi-tenant apps, disable strict issuer validation
                    // This allows tokens from any Azure AD tenant
                    options.TokenValidationParameters.ValidateIssuer = false;

                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            var accessToken = context.Request.Query["token"];
                            if (!string.IsNullOrEmpty(accessToken))
                            {
                                context.Token = accessToken;
                            }
                            return Task.CompletedTask;
                        }
                    };
                }, options => { builder.Configuration.Bind("AzureAd", options); })
                .EnableTokenAcquisitionToCallDownstreamApi(options =>
                {
                    builder.Configuration.Bind("AzureAd", options);
                })
                .AddMicrosoftGraph(builder.Configuration.GetSection("GraphV1"))
                .AddInMemoryTokenCaches();

            builder.Services.AddSingleton<GraphServiceClient>(sp =>
            {
                // The client credentials flow requires that you request the
                // /.default scope, and pre-configure your permissions on the
                // app registration in Azure. An administrator must grant consent
                // to those permissions beforehand.
                var scopes = new[] { "https://graph.microsoft.com/.default" };
                var clientId = builder.Configuration["AzureAd:ClientId"];
                var tenantId = builder.Configuration["AzureAd:TenantId"];
                var clientSecret = builder.Configuration["AzureAd:ClientSecret"];

                var authProvider = new ClientSecretCredential(tenantId, clientId, clientSecret);
                return new GraphServiceClient(authProvider, scopes);
            });

            //// Configure ConfidentialClient access for Graph API calls
            //builder.Services.AddScoped<GraphServiceClient>(sp =>
            //{
            //    var httpContext = sp.GetRequiredService<IHttpContextAccessor>()
            //            .HttpContext;

            //    var userToken = httpContext!
            //        .Request
            //        .Headers["Authorization"]
            //        .ToString()
            //        .Replace("Bearer ", "");

            //    var options = builder.Configuration
            //        .GetSection("AzureAd")
            //        .Get<MicrosoftIdentityOptions>()!;

            //    var cca = ConfidentialClientApplicationBuilder
            //        .Create(options.ClientId)
            //        .WithClientSecret(options.ClientSecret)
            //        .WithTenantId(options.TenantId)
            //        .Build();

            //    var result = cca
            //        .AcquireTokenOnBehalfOf(
            //            new[] { "https://graph.microsoft.com/.default" },
            //            new UserAssertion(userToken))
            //        .ExecuteAsync()
            //        .GetAwaiter()
            //        .GetResult();

            //    return new GraphServiceClient(
            //        new DelegateAuthenticationProvider(req =>
            //        {
            //            req.Headers.Authorization =
            //                new AuthenticationHeaderValue("Bearer", result.AccessToken);
            //            return Task.CompletedTask;
            //        }));
            //});

            builder.Services.AddAuthentication()
                    .AddScheme<ApiKeyAuthenticationSchemeOptions, ApiKeyAuthenticationHandler>("ApiKey", options => { });

            // Configure authorization to accept both Azure AD and API Key authentication
            builder.Services.AddAuthorization(options =>
            {
                // Default policy accepts both authentication schemes
                if (apiKeysEnabled)
                {
                    options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder(
                        JwtBearerDefaults.AuthenticationScheme, "ApiKey")
                        .RequireAuthenticatedUser()
                        .RequireRole(UserRoles.GlobalAdministrator, UserRoles.DatacenterTechnician, UserRoles.WorkspaceManager, UserRoles.WorkspaceUser, UserRoles.DeviceRegistration)
                        .Build();
                }
                else
                {
                    options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder(
                        JwtBearerDefaults.AuthenticationScheme)
                        .RequireAuthenticatedUser()
                        .RequireRole(UserRoles.GlobalAdministrator, UserRoles.DatacenterTechnician, UserRoles.WorkspaceManager, UserRoles.WorkspaceUser)
                        .Build();
                }

                // Define authorization policies
                options.AddPolicy("GlobalAdministrator", policy =>
                {
                    policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, "ApiKey");
                    policy.RequireRole(UserRoles.GlobalAdministrator);
                });
                options.AddPolicy("DatacenterTechnician", policy =>
                {
                    policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, "ApiKey");
                    policy.RequireRole(UserRoles.GlobalAdministrator, UserRoles.DatacenterTechnician);
                });
                options.AddPolicy("WorkspaceManager", policy =>
                {
                    policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, "ApiKey");
                    policy.RequireRole(UserRoles.GlobalAdministrator, UserRoles.DatacenterTechnician, UserRoles.WorkspaceManager);
                });
                options.AddPolicy("WorkspaceUser", policy =>
                {
                    policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, "ApiKey");
                    policy.RequireRole(UserRoles.GlobalAdministrator, UserRoles.DatacenterTechnician, UserRoles.WorkspaceManager, UserRoles.WorkspaceUser);
                });
                options.AddPolicy("DeviceRegistration", policy =>
                {
                    policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, "ApiKey");
                    policy.RequireRole(UserRoles.DeviceRegistration);
                });
            });

            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = $"MDC.Api {Assembly.GetExecutingAssembly().GetName().Version?.ToString()}", Version = "v1" });
                // var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml"));
                c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, $"{typeof(MDC.Shared.Models.Workspace).Assembly.GetName().Name}.xml"));
                // c.SchemaFilter<DeltaSchemaFilter<WorkspaceDescriptor>>();

                // Add JWT Bearer authentication to Swagger
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });

                if (apiKeysEnabled)
                {
                    // Add API Key authentication to Swagger
                    c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
                    {
                        Description = "API Key authentication. Use X-API-Key header or apikey query parameter.",
                        Name = "X-API-Key",
                        In = ParameterLocation.Header,
                        Type = SecuritySchemeType.ApiKey
                    });
                }

                c.AddSecurityRequirement(document => 
                    apiKeysEnabled ? new OpenApiSecurityRequirement
                    {
                        [new OpenApiSecuritySchemeReference("Bearer", document)] = [],
                        [new OpenApiSecuritySchemeReference("ApiKey", document)] = []
                    } 
                    : new OpenApiSecurityRequirement
                    {
                        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
                    });
            });

            // OpenAPI
            builder.Services.AddOpenApi();

            // Configure CORS
            var webOrigins = builder.Configuration.GetSection("CORS:AllowedOrigins").Get<string[]>() ?? new[]
            {
                "http://localhost:3000",           // Local development
            };

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("MDCWebPolicy", policy =>
                {
                    policy
                        .WithOrigins(webOrigins)
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials();
                });

                // More permissive policy for development
                options.AddPolicy("DevelopmentPolicy", policy =>
                {
                    policy
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader();
                });
            });

            // Add Exception Handling
            builder.Services.AddProblemDetails();
            builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

            var app = builder.Build();

            // Configure Exeption Handler.  Must be before OData/MVC routing
            app.UseExceptionHandler();
            app.UseStatusCodePages();

            // WebSocket configuration with a 30-second keep-alive interval, required for Console streaming
            app.UseWebSockets(new WebSocketOptions
            {
                KeepAliveInterval = TimeSpan.FromSeconds(30),
            });

            using (var scope = app.Services.CreateScope())
            {
                // Apply database migrations
                await scope.UseMicroDatacenterMigrationsAsync();
            }
            
            app.UseODataBatching();

            app.UseHttpsRedirection();

            // Configure CORS middleware
            if (app.Environment.IsDevelopment())
            {
                app.UseCors("DevelopmentPolicy");
            }
            else
            {
                app.UseCors("MDCWebPolicy");
            }
            
            app.UseAuthentication();
            app.UseAuthorization();

            //if (app.Environment.IsDevelopment())
            {
                app.UseODataRouteDebug();
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    // c.EnablePersistAuthorization();
                    //c.SupportedSubmitMethods(new Swashbuckle.AspNetCore.SwaggerUI.SubmitMethod[] { });
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MDC.Api V1");
                });

                // Scalar
                app.MapScalarApiReference();
            }

            // OpenAPI
            app.MapOpenApi();

            // app.UseRouting();

            app.MapControllers();

            await app.RunAsync();
        }
    }
}
