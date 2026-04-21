# MDC — Administrator Guide

## Overview

This guide covers the deployment, configuration, security, and ongoing operation of the MicroDataCenter (MDC) platform. It is intended for system administrators and infrastructure engineers responsible for running the MDC API and its supporting services.

---

## Architecture

The MDC platform consists of:

| Component | Technology | Purpose |
|---|---|---|
| **MDC.Api** | ASP.NET Core 8 | REST/OData API server |
| **Database** | SQL Server (or compatible) | Persistent storage |
| **Identity Provider** | Azure AD CIAM | User authentication |
| **Microsoft Graph** | Graph API v1.0 | User directory integration |
| **Proxmox VE** | Proxmox nodes | Virtualisation platform |

---

## Deployment

### Prerequisites

- .NET 8 Runtime
- SQL Server (or Azure SQL)
- Azure AD CIAM tenant with an app registration
- TLS certificate for HTTPS
- Network access to Proxmox VE nodes

### Docker Deployment

A `Dockerfile` is included in the repository root.

```bash
# Build the image
docker build -t mdc-api .

# Run the container
docker run -d \
  -p 7078:7078 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ConnectionStrings__DefaultConnection="<connection-string>" \
  -e AzureAd__ClientId="<client-id>" \
  -e AzureAd__ClientSecret="<client-secret>" \
  -e AzureAd__TenantId="<tenant-id>" \
  --name mdc-api \
  mdc-api
```

### Direct Deployment

```bash
cd MDC.Api
dotnet publish -c Release -o ./publish
cd publish
dotnet MDC.Api.dll
```

### CI/CD Pipelines

The repository includes Azure Pipelines configuration files:

- `azure-pipelines.yml` — Main pipeline
- `azure-pipelines-develop.yml` — Development branch pipeline
- `azure-pipelines-1.yml`, `azure-pipelines-2.yml` — Additional pipeline variants

---

## Configuration

All configuration is managed through `appsettings.json`, environment-specific overrides (`appsettings.Production.json`), and environment variables. Environment variables override file-based configuration.

### Required Configuration

#### Azure AD

```json
"AzureAd": {
  "Instance": "https://<your-tenant>.ciamlogin.com/",
  "TenantId": "<tenant-id>",
  "ClientId": "<client-id>",
  "ClientSecret": "<client-secret>",
  "Audience": "<client-id>",
  "Scopes": "MDC.Access",
  "EnterpriseAppObjectId": "<enterprise-app-object-id>"
}
```

#### Microsoft Graph

```json
"GraphV1": {
  "BaseUrl": "https://graph.microsoft.com/v1.0",
  "Scopes": [ "User.Read" ]
}
```

#### Database

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=<server>;Database=MDC;User Id=<user>;Password=<password>;"
}
```

### Optional Configuration

#### API Key Authentication

To enable API key authentication, set:

```bash
API_KEYS_ENABLED=true
```

Then define keys in `appsettings.json`:

```json
"ValidApiKeys": [
  {
    "Key": "<secure-random-key>",
    "Name": "Service Account - Monitoring",
    "UserId": "svc-monitoring",
    "ObjectId": "<azure-ad-object-id>",
    "Roles": [ "WorkspaceUser" ]
  }
]
```

> **Security**: Never commit real API keys to source control. Use environment variables or a secrets manager in production.

#### CORS

Configure allowed web origins for browser-based clients:

```json
"CORS": {
  "AllowedOrigins": [
    "https://app.yourdomain.com",
    "https://admin.yourdomain.com"
  ]
}
```

In development, all origins are permitted (`DevelopmentPolicy`). In production, only the configured origins are allowed (`MDCWebPolicy`).

#### Logging

```json
"Logging": {
  "LogLevel": {
    "Default": "Information",
    "Microsoft.AspNetCore": "Warning",
    "MDC": "Debug"
  }
}
```

For production, consider integrating with Application Insights or a structured logging sink (e.g., Seq, Elasticsearch).

---

## Azure AD App Registration

### Required App Registration Settings

1. **Platform**: Web API
2. **Expose an API**: Add scope `MDC.Access`
3. **App Roles**: Create the following roles in the manifest:

```json
"appRoles": [
  {
    "displayName": "Global Administrator",
    "id": "<guid>",
    "isEnabled": true,
    "value": "GlobalAdministrator"
  },
  {
    "displayName": "Datacenter Technician",
    "id": "<guid>",
    "isEnabled": true,
    "value": "DatacenterTechnician"
  },
  {
    "displayName": "Workspace Manager",
    "id": "<guid>",
    "isEnabled": true,
    "value": "WorkspaceManager"
  },
  {
    "displayName": "Workspace User",
    "id": "<guid>",
    "isEnabled": true,
    "value": "WorkspaceUser"
  },
  {
    "displayName": "Device Registration",
    "id": "<guid>",
    "isEnabled": true,
    "value": "DeviceRegistration"
  }
]
```

4. **API Permissions**: Grant `User.Read` for Microsoft Graph (delegated)
5. **Client Secret**: Generate a secret and store it securely

### Assigning Roles to Users

1. Navigate to **Azure Portal → Enterprise Applications → MDC API**
2. Select **Users and groups**
3. Click **Add user/group**
4. Select the user and assign the appropriate role

---

## User Management

### Registering a New User

Users must exist in Azure AD before they can be registered in MDC. Once the Azure AD account exists:

```http
POST /odata/Users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "azureAdObjectId": "<azure-ad-object-id>",
  "displayName": "Jane Smith"
}
```

### Updating a User

```http
PATCH /odata/Users(<user-id>)
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "displayName": "Jane Smith-Jones"
}
```

### Removing a User

```http
DELETE /odata/Users(<user-id>)
Authorization: Bearer <admin-token>
```

> Removing a user from MDC does not delete their Azure AD account.

### Listing Unregistered Users

To find Azure AD users who have not yet been registered in MDC:

```http
GET /odata/Users?getUnregisteredUsers=true
Authorization: Bearer <admin-token>
```

---

## Zero Touch Provisioning (ZTP) Administration

ZTP automates the installation and registration of new Proxmox VE nodes.

### Preparing a ZTP ISO

On a machine with the Proxmox auto-install assistant installed:

```bash
proxmox-auto-install-assistant prepare-iso ./proxmox-ve_9.1-1_autoinstall.iso \
  --fetch-from http \
  --url "https://<mdc-host>:7078/api/ZTP/register" \
  --cert-fingerprint "<tls-cert-sha256-fingerprint>"
```

The TLS certificate fingerprint can be obtained with:
```bash
openssl s_client -connect <mdc-host>:7078 </dev/null 2>/dev/null | \
  openssl x509 -fingerprint -sha256 -noout
```

### Enabling ZTP API Key

ZTP devices authenticate using an API key with the `DeviceRegistration` role. Add a key to `ValidApiKeys`:

```json
{
  "Key": "<secure-device-registration-key>",
  "Name": "ZTP Device Registration",
  "UserId": "ztp-device",
  "ObjectId": "<guid>",
  "Roles": [ "DeviceRegistration" ]
}
```

### Approving a Node Registration

After a device completes installation, it appears in the pending registrations list:

```http
GET /odata/SiteNodeRegistrations
Authorization: Bearer <technician-token>
```

To approve and assign the node to a site:

```http
PUT /odata/SiteNodeRegistrations(<registration-id>)
Authorization: Bearer <technician-token>
Content-Type: application/json

{
  "approved": true,
  "siteId": "<target-site-id>"
}
```

To reject and remove a registration:

```http
DELETE /odata/SiteNodeRegistrations(<registration-id>)
Authorization: Bearer <technician-token>
```

---

## Database Management

### Automatic Migrations

Database migrations are applied automatically when the application starts. No manual migration steps are required in normal operation.

### Manual Migration (if needed)

```bash
cd MDC.Core
dotnet ef database update --startup-project ../MDC.Api
```

### Creating a New Migration (development)

```bash
cd MDC.Core
dotnet ef migrations add <MigrationName> --startup-project ../MDC.Api
```

---

## Security Hardening

### TLS

- Always run the API behind HTTPS in production
- Use a valid TLS certificate from a trusted CA (required for ZTP)
- Configure HTTPS redirection is enabled by default (`app.UseHttpsRedirection()`)

### API Keys

- Rotate API keys regularly
- Use unique keys per service/integration
- Store keys in a secrets manager (Azure Key Vault, HashiCorp Vault) rather than in `appsettings.json`
- Disable API key authentication (`API_KEYS_ENABLED=false`) if not required

### CORS

- In production, always use `MDCWebPolicy` with an explicit list of allowed origins
- Never deploy with `DevelopmentPolicy` (allows all origins) in production

### Token Validation

- Issuer validation is disabled to support multi-tenant scenarios. If your deployment is single-tenant, re-enable it:
  ```csharp
  options.TokenValidationParameters.ValidateIssuer = true;
  options.TokenValidationParameters.ValidIssuer = "https://login.microsoftonline.com/<tenant-id>/v2.0";
  ```

---

## Monitoring & Logging

### Health Checks

Use the Auth Test endpoint to verify the API is running and authentication is working:

```http
GET /api/AuthTest/anonymous
```

Expected response: `200 OK`

### Log Levels

Adjust log verbosity in `appsettings.json`:

```json
"Logging": {
  "LogLevel": {
    "Default": "Information",
    "Microsoft.AspNetCore": "Warning",
    "MDC.Api.Controllers": "Debug"
  }
}
```

Key log events to monitor:

| Event | Level | Significance |
|---|---|---|
| ZTP registration requests | `Information` | New device attempting to register |
| Site node approval | `Debug` | Technician approved/rejected a node |
| Workspace lock changes | `Debug` | Workspace locked or unlocked |
| VNC console connections | `Debug` | User opened a VM console |
| Authentication failures | `Warning` (framework) | Potential unauthorized access |

### OData Route Debugging

The OData route debugger is enabled at `/odata/$odata`. This lists all registered OData routes and is useful for diagnosing routing issues. Consider disabling this in production by removing `app.UseODataRouteDebug()` from `Program.cs`.

---

## Proxmox VE Integration

The MDC API communicates directly with Proxmox VE nodes via the Proxmox API client (`MDC.Core.Services.Providers.PVEClient`). Ensure:

1. The MDC API server has network access to all Proxmox nodes on their API port (default: 8006)
2. A Proxmox API token or user credentials are configured for the MDC service account
3. The Proxmox node's TLS certificate is trusted by the MDC API server (or certificate validation is appropriately configured)

---

## Backup & Recovery

### Database Backup

Back up the MDC SQL database regularly. The database contains:
- Organization, site, and workspace definitions
- User registrations
- Device configurations
- Activity logs
- Site node registration records

### Configuration Backup

Ensure the following are backed up and stored securely:
- `appsettings.Production.json`
- Azure AD app registration details
- TLS certificates
- API keys (if used)

### Recovery Procedure

1. Restore the database from backup
2. Restore configuration files
3. Redeploy the application
4. Verify connectivity to Azure AD and Proxmox nodes
5. Test with `GET /api/AuthTest/anonymous`

---

## Troubleshooting

### Application Fails to Start

- Check that the database connection string is correct and the database server is reachable
- Verify Azure AD configuration (`ClientId`, `TenantId`, `ClientSecret`)
- Review startup logs for migration errors

### Authentication Errors (401)

- Verify the Azure AD `TenantId` and `ClientId` match the app registration
- Confirm the token audience matches the `ClientId`
- Check that the user has been assigned a role in the Azure AD Enterprise Application

### Users Cannot Access Endpoints (403)

- Confirm the user has been assigned an app role in Azure AD
- Verify the role assignment has propagated (may take a few minutes)
- Use `GET /api/AuthTest/authenticated` to inspect the claims in the token

### ZTP Devices Not Registering

- Verify the MDC API is reachable from the device network
- Confirm the TLS certificate fingerprint in the ISO matches the server certificate
- Check that `API_KEYS_ENABLED=true` is set
- Verify a `DeviceRegistration` API key is configured
- Review logs for `ZTPController` entries

### WebSocket / VNC Console Issues

- Confirm WebSocket support is not blocked by a reverse proxy or firewall
- Ensure the reverse proxy (if any) is configured to pass WebSocket upgrade headers
- Verify the Proxmox node is online and the VM is running
- Check the 30-second keep-alive is not being terminated by intermediate network devices
