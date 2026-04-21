using MDCConsoleApp;
using Microsoft.Extensions.Configuration;
using Microsoft.Identity.Client;
using System.Net.Http.Headers;

// Reference: https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-web-api-dotnet-core-call-protected-api

HttpClient client = new HttpClient();

using ConfigurationManager configurationManager = new ConfigurationManager();
configurationManager.AddUserSecrets(typeof(Program).Assembly);
var config = configurationManager.GetRequiredSection("MDCConsoleApp").Get<MDCConsoleAppConfiguration>();
if (config == null)
    throw new ApplicationException("Application Configuration is missing MDCConsoleApp section.");

var app = ConfidentialClientApplicationBuilder
    .Create(config.ClientId)
    .WithAuthority(config.Authority)
    .WithClientSecret(config.ClientSecret)
    .Build();

var result = await app.AcquireTokenForClient(config.Scopes).ExecuteAsync();
Console.WriteLine($"Access Token: {result.AccessToken}");

client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", result.AccessToken);
var response = await client.GetAsync("https://localhost:7078/odata/Users");
var content = await response.Content.ReadAsStringAsync();

Console.WriteLine("Your response is: " + response.StatusCode);
Console.WriteLine(content);
Console.WriteLine();