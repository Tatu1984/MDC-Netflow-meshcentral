using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MDC.Core.Services.Api;

internal class UserServiceOptions
{
    public const string ConfigurationSectionName = "AzureAd";

    public string? TenantId { get; set; }

    public string? ClientId { get; set; }

    public string? EnterpriseAppObjectId { get; set; }

    public string? ClientSecret { get; set; }
}
