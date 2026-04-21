# MDC API — Developer Guide

## Overview

The MicroDataCenter Web API (MDC.Api) is an ASP.NET Core 8 application that exposes a RESTful/OData interface for managing micro data center infrastructure. It integrates with Proxmox VE for virtualisation, Azure Active Directory (CIAM) for identity, and Microsoft Graph for user management.

Base URL: `https://<host>:7078`

Interactive API documentation is available at:
- **Swagger UI**: `https://<host>:7078/swagger`
- **Scalar UI**: `https://<host>:7078/scalar/v1`
- **OpenAPI JSON**: `https://<host>:7078/openapi/v1.json`

---

## Authentication

All endpoints (except `POST /api/ZTP/register`) require authentication. Two schemes are supported:

### 1. Bearer Token (Azure AD / CIAM)

Obtain a JWT from the configured Azure CIAM tenant and pass it in the `Authorization` header:

```http
Authorization: Bearer <your-jwt-token>
```

Tokens can also be passed as a query parameter for WebSocket connections:

```
wss://<host>:7078/api/VNC/Workspaces(<id>)/VirtualMachineConsole(<vmid>)?token=<jwt>
```

**Azure AD configuration** (from `appsettings.json`):
```json
"AzureAd": {
  "Instance": "https://tensparrowsmicrodatacluster.ciamlogin.com/",
  "TenantId": "88714d9d-6787-42a3-929c-4242bac15119",
  "Scopes": "MDC.Access"
}
```

### 2. API Key

API key authentication must be enabled via the `API_KEYS_ENABLED=true` environment variable. Pass the key in either:

- **Header**: `X-API-Key: <key>`
- **Query parameter**: `?apikey=<key>`

API keys are configured in `appsettings.json` under `ValidApiKeys`, each with an associated user identity and role(s).

---

## Roles & Authorization Policies

| Role | Description |
|---|---|
| `GlobalAdministrator` | Full access to all endpoints |
| `DatacenterTechnician` | Access to site node registrations and infrastructure management |
| `WorkspaceManager` | Can create, update, and delete workspaces |
| `WorkspaceUser` | Read and limited operational access to workspaces |
| `DeviceRegistration` | Used exclusively by ZTP (Zero Touch Provisioning) devices |

Policies are hierarchical — `GlobalAdministrator` satisfies all lower-level policies.

---

## OData Query Capabilities

All `GET` collection endpoints support OData query options. The maximum page size is **100 records**.

| Option | Example | Description |
|---|---|---|
| `$select` | `$select=id,name` | Return only specified fields |
| `$filter` | `$filter=name eq 'HQ'` | Filter results |
| `$orderby` | `$orderby=name asc` | Sort results |
| `$top` | `$top=10` | Limit number of results |
| `$skip` | `$skip=20` | Pagination offset |
| `$count` | `$count=true` | Include total count |
| `$expand` | `$expand=sites` | Expand related entities |

Example:
```http
GET /odata/Organizations?$filter=name eq 'Acme'&$select=id,name&$top=5
Authorization: Bearer <token>
```

---

## OData Batch Requests

The API supports OData batch requests at `POST /odata/$batch`. Batch requests allow multiple operations in a single HTTP call.

- Max nesting depth: 10
- Max operations per changeset: 1,000
- Max message size: 1 MB

---

## Endpoints Reference

### Organizations

Manage top-level organizational entities.

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` | `/odata/Organizations` | List all organizations | Any authenticated |
| `GET` | `/odata/Organizations({key})` | Get organization by ID | Any authenticated |
| `POST` | `/odata/Organizations` | Create organization | Any authenticated |
| `PATCH` | `/odata/Organizations({key})` | Update organization | Any authenticated |
| `DELETE` | `/odata/Organizations({key})` | Delete organization | Any authenticated |

**Create Organization** (`POST /odata/Organizations`):
```json
{
  "name": "Acme Corp",
  "description": "Primary organization"
}
```

---

### Sites

Sites represent physical data center locations.

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` | `/odata/Sites` | List all sites | Any authenticated |
| `GET` | `/odata/Sites({key})` | Get site by ID | Any authenticated |
| `POST` | `/odata/Sites` | Create site | Any authenticated |
| `POST` | `/odata/Sites({key})/RemoveNode` | Remove a node from a site | Any authenticated |
| `GET` | `/odata/Sites({key})/DownloadableTemplates` | List available VM templates | Any authenticated |
| `POST` | `/odata/Sites({key})/DownloadTemplate` | Trigger template download | Any authenticated |

**Create Site** (`POST /odata/Sites`):
```json
{
  "memberAddress": "10.10.72.84",
  "organizationId": "<org-guid>"
}
```

**Remove Node** (`POST /odata/Sites({key})/RemoveNode`):
```json
{
  "siteNodeId": "<node-guid>"
}
```

**Download Template** (`POST /odata/Sites({key})/DownloadTemplate`):
```json
{
  "templateName": "ubuntu-22.04-standard",
  "storage": "local"
}
```

---

### Workspaces

Workspaces are isolated virtual environments within a site.

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` | `/odata/Workspaces` | List all workspaces | Any authenticated |
| `GET` | `/odata/Workspaces({key})` | Get workspace by ID | Any authenticated |
| `POST` | `/odata/Workspaces` | Create workspace | Any authenticated |
| `DELETE` | `/odata/Workspaces({key})` | Delete workspace | Any authenticated |
| `GET` | `/odata/Workspaces({key})/Descriptor` | Get workspace descriptor | Any authenticated |
| `PUT` | `/odata/Workspaces({key})/UpdateDescriptor` | Update workspace descriptor | Any authenticated |
| `PUT` | `/odata/Workspaces({key})/Lock` | Lock or unlock workspace | Any authenticated |
| `PUT` | `/odata/Workspaces({key})/RunCommand` | Execute command on a VM | Any authenticated |

**Create Workspace** (`POST /odata/Workspaces`):
```json
{
  "siteId": "<site-guid>",
  "name": "Training Lab 1",
  "templateId": "<template-guid>"
}
```

**Lock Workspace** (`PUT /odata/Workspaces({key})/Lock`):
```json
{
  "locked": true
}
```

**Run Command** (`PUT /odata/Workspaces({key})/RunCommand`):
```json
{
  "virtualMachineIndex": 0,
  "command": "reboot"
}
```

> **Note**: Custom OData actions use `PUT` rather than `PATCH` due to OData routing constraints.

---

### VNC Console (WebSocket)

Provides real-time browser-based access to VM consoles via a proxied WebSocket connection to Proxmox VNC.

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` (WebSocket) | `/api/VNC/Workspaces({key})/VirtualMachineConsole({vmid})` | Open VM console | Any authenticated |

This endpoint **requires a WebSocket upgrade**. Standard HTTP requests return `400 Bad Request`.

**Connection example (JavaScript)**:
```javascript
const ws = new WebSocket(
  `wss://host:7078/api/VNC/Workspaces(${workspaceId})/VirtualMachineConsole(${vmid})?token=${jwtToken}`
);
```

The server maintains a 30-second WebSocket keep-alive interval.

---

### Site Node Registrations

Manage pending device registration requests. Requires `DatacenterTechnician` or `GlobalAdministrator` role.

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` | `/odata/SiteNodeRegistrations` | List all pending registrations | DatacenterTechnician |
| `PUT` | `/odata/SiteNodeRegistrations({key})` | Approve/reject registration | DatacenterTechnician |
| `DELETE` | `/odata/SiteNodeRegistrations({key})` | Delete registration | DatacenterTechnician |

**Approve Registration** (`PUT /odata/SiteNodeRegistrations({key})`):
```json
{
  "approved": true,
  "siteId": "<site-guid>"
}
```

---

### Zero Touch Provisioning (ZTP)

Automates Proxmox VE node installation. The `POST /api/ZTP/register` endpoint is **anonymous** — all others require the `DeviceRegistration` API key role.

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/ZTP/register` | Request auto-install answer file | Anonymous |
| `GET` | `/api/ZTP/firstboot/{uuid}` | Get first-boot script | DeviceRegistration |
| `POST` | `/api/ZTP/notify/{uuid}` | Notify auto-installation complete | DeviceRegistration |
| `POST` | `/api/ZTP/firstboot/{uuid}` | Notify first-boot complete | DeviceRegistration |

**ZTP ISO Preparation** (run on the Proxmox ISO):
```bash
proxmox-auto-install-assistant prepare-iso ./proxmox-ve_9.1-1_autoinstall.iso \
  --fetch-from http \
  --url "https://<host>:7078/api/ZTP/register" \
  --cert-fingerprint "<tls-cert-fingerprint>"
```

**ZTP Workflow**:
1. Device boots from prepared ISO → `POST /api/ZTP/register` (anonymous)
2. API returns answer file; device completes unattended installation
3. Device calls `POST /api/ZTP/notify/{uuid}` with device info
4. Technician approves via `PUT /odata/SiteNodeRegistrations({key})`
5. Device calls `GET /api/ZTP/firstboot/{uuid}` to get post-install script
6. Device calls `POST /api/ZTP/firstboot/{uuid}` to signal completion

---

### Users

Manage users registered in the system (backed by Azure AD / Microsoft Graph).

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` | `/odata/Users` | List users | Any authenticated |
| `GET` | `/odata/Users({key})` | Get user by ID | Any authenticated |
| `POST` | `/odata/Users` | Register a user | Any authenticated |
| `PATCH` | `/odata/Users({key})` | Update user | Any authenticated |
| `DELETE` | `/odata/Users({key})` | Remove user | Any authenticated |

The `GET /odata/Users` endpoint accepts a `getUnregisteredUsers` query parameter (default: `true`) to include Azure AD users not yet registered in the MDC system.

---

### Remote Networks

Manage remote network configurations.

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` | `/odata/RemoteNetworks` | List all remote networks | Any authenticated |
| `GET` | `/odata/RemoteNetworks({key})` | Get remote network by ID | Any authenticated |
| `PUT` | `/odata/RemoteNetworks({key})` | Update remote network | Any authenticated |

---

### Device Configurations

Manage hardware device configuration profiles.

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` | `/odata/DeviceConfigurations` | List configurations (page size: 10) | Any authenticated |
| `GET` | `/odata/DeviceConfigurations({key})` | Get configuration by ID | Any authenticated |
| `POST` | `/odata/DeviceConfigurations` | Create configuration | Any authenticated |
| `DELETE` | `/odata/DeviceConfigurations({key})` | Delete configuration | Any authenticated |

---

### Activity Logs

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` | `/odata/ActivityLogs` | List activity logs | Any authenticated |

---

### App Roles

| Method | Path | Description | Min Role |
|---|---|---|---|
| `GET` | `/odata/AppRoles` | List all application roles | Any authenticated |

---

### Auth Test

Diagnostic endpoints for verifying authentication and role configuration.

| Method | Path | Required Role |
|---|---|---|
| `GET` | `/api/AuthTest/anonymous` | None |
| `GET` | `/api/AuthTest/authenticated` | Any authenticated |
| `GET` | `/api/AuthTest/admin` | GlobalAdministrator |
| `GET` | `/api/AuthTest/technician` | DatacenterTechnician |
| `GET` | `/api/AuthTest/manager` | WorkspaceManager |
| `GET` | `/api/AuthTest/user` | WorkspaceUser |

---

## Error Handling

The API uses RFC 7807 Problem Details for error responses.

| Status Code | Meaning |
|---|---|
| `200 OK` | Success |
| `201 Created` | Resource created |
| `204 No Content` | Success, no body (delete/update) |
| `400 Bad Request` | Validation error or malformed request |
| `401 Unauthorized` | Missing or invalid credentials |
| `403 Forbidden` | Authenticated but insufficient role |
| `404 Not Found` | Resource does not exist |
| `500 Internal Server Error` | Unhandled server error |

Error response body:
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "The memberAddress field is required."
}
```

---

## Response Format

All responses use **camelCase** JSON property names. `null` values are omitted from responses.

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "HQ Site",
  "memberAddress": "10.10.72.84"
}
```

---

## Development Setup

### Prerequisites

- .NET 8 SDK
- SQL Server or compatible database
- Azure AD / CIAM tenant (or use API key mode for local dev)
- Proxmox VE node (for full functionality)

### Configuration

Create `MDC.Api/appsettings.Development.json` or use .NET User Secrets:

```bash
cd MDC.Api
dotnet user-secrets set "AzureAd:ClientId" "<your-client-id>"
dotnet user-secrets set "AzureAd:ClientSecret" "<your-client-secret>"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<your-connection-string>"
```

To enable API key authentication locally:
```bash
dotnet user-secrets set "API_KEYS_ENABLED" "true"
```

### Running the API

```bash
cd MDC.Api
dotnet run
```

Database migrations are applied automatically on startup.

### Running Tests

```bash
dotnet test
```

Test projects:
- `MDC.Api.Tests` — Unit tests for the API layer
- `MDC.Core.Tests` — Unit tests for core services
- `MDC.Shared.Tests` — Unit tests for shared models
- `MDC.Integration.Tests` — Integration tests

---

## Project Structure

```
MicroDataCenter-WebAPI/
├── MDC.Api/                  # ASP.NET Core Web API
│   ├── Controllers/          # API controllers
│   ├── Services/             # API-layer services (auth, etc.)
│   └── Program.cs            # Application entry point
├── MDC.Core/                 # Business logic & data access
│   ├── Services/             # Domain services
│   └── Extensions/           # DI registration extensions
├── MDC.Shared/               # Shared models & DTOs
│   └── Models/               # Request/response models
├── MDC.*.Tests/              # Test projects
└── postman/                  # Postman collections & environments
```
