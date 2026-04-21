# MDC Application — User Guide

## Introduction

The MicroDataCenter (MDC) application lets you provision, manage, and access virtual workspace environments hosted on micro data center hardware. This guide covers the day-to-day tasks you will perform as a user of the system.

---

## Getting Started

### Signing In

The MDC application uses your organization's Azure Active Directory account for sign-in. Contact your administrator to ensure your account has been registered in the system and assigned an appropriate role.

Once signed in, your access level is determined by your assigned role:

| Role | What you can do |
|---|---|
| **WorkspaceUser** | View and use workspaces assigned to you |
| **WorkspaceManager** | Create, configure, and delete workspaces |
| **DatacenterTechnician** | Manage physical site nodes and approve device registrations |
| **GlobalAdministrator** | Full access to all features |

### API Access

If you are accessing the MDC API directly (e.g., via Postman or a script), you will need either:

- A **Bearer token** obtained from your Azure AD sign-in flow, or
- An **API key** provided by your administrator (if API key access is enabled)

Pass the Bearer token in the `Authorization` header:
```
Authorization: Bearer <your-token>
```

Or pass an API key in the `X-API-Key` header:
```
X-API-Key: <your-api-key>
```

---

## Managing Organizations

Organizations are the top-level grouping for all resources in MDC.

### View Organizations

```http
GET /odata/Organizations
```

Returns a list of all organizations you have access to.

### Create an Organization

```http
POST /odata/Organizations
Content-Type: application/json

{
  "name": "Acme Corporation",
  "description": "Primary business unit"
}
```

### Update an Organization

```http
PATCH /odata/Organizations(<organization-id>)
Content-Type: application/json

{
  "description": "Updated description"
}
```

### Delete an Organization

```http
DELETE /odata/Organizations(<organization-id>)
```

---

## Managing Sites

Sites represent physical data center locations. Each site contains one or more hardware nodes running Proxmox VE.

### View Sites

```http
GET /odata/Sites
```

### View a Specific Site

```http
GET /odata/Sites(<site-id>)
```

### Create a Site

To add a new physical site, provide the IP address of the Proxmox node and the organization it belongs to:

```http
POST /odata/Sites
Content-Type: application/json

{
  "memberAddress": "10.10.72.84",
  "organizationId": "<organization-id>"
}
```

### Remove a Node from a Site

To remove a specific hardware node from a site:

```http
POST /odata/Sites(<site-id>)/RemoveNode
Content-Type: application/json

{
  "siteNodeId": "<node-id>"
}
```

---

## Managing VM Templates

Templates are pre-built virtual machine images that can be deployed as workspaces.

### View Available Templates

```http
GET /odata/Sites(<site-id>)/DownloadableTemplates
```

Returns a list of templates available for download to the site.

### Download a Template

To make a template available for workspace deployment:

```http
POST /odata/Sites(<site-id>)/DownloadTemplate
Content-Type: application/json

{
  "templateName": "ubuntu-22.04-standard",
  "storage": "local"
}
```

Template downloads run asynchronously on the Proxmox node. Check the site status to confirm completion.

---

## Managing Workspaces

Workspaces are isolated virtual environments — typically a set of virtual machines — provisioned for a specific purpose such as a training lab, development environment, or test bench.

### View All Workspaces

```http
GET /odata/Workspaces
```

### View a Specific Workspace

```http
GET /odata/Workspaces(<workspace-id>)
```

### Create a Workspace

```http
POST /odata/Workspaces
Content-Type: application/json

{
  "siteId": "<site-id>",
  "name": "Training Lab 1",
  "templateId": "<template-id>"
}
```

### Get Workspace Descriptor

The workspace descriptor contains the detailed configuration of the workspace, including virtual machine definitions:

```http
GET /odata/Workspaces(<workspace-id>)/Descriptor
```

### Update Workspace Descriptor

To modify the workspace configuration:

```http
PUT /odata/Workspaces(<workspace-id>)/UpdateDescriptor
Content-Type: application/json

{
  "name": "Updated Lab Name",
  "virtualMachines": [
    {
      "index": 0,
      "name": "Server-01"
    }
  ]
}
```

### Lock or Unlock a Workspace

Locking a workspace prevents modifications. This is useful during active training sessions or when a workspace is in use.

**Lock:**
```http
PUT /odata/Workspaces(<workspace-id>)/Lock
Content-Type: application/json

{
  "locked": true
}
```

**Unlock:**
```http
PUT /odata/Workspaces(<workspace-id>)/Lock
Content-Type: application/json

{
  "locked": false
}
```

### Run a Command on a Virtual Machine

Execute a command on a specific virtual machine within a workspace:

```http
PUT /odata/Workspaces(<workspace-id>)/RunCommand
Content-Type: application/json

{
  "virtualMachineIndex": 0,
  "command": "reboot"
}
```

The `virtualMachineIndex` refers to the position of the VM in the workspace's VM list (starting at 0).

### Delete a Workspace

```http
DELETE /odata/Workspaces(<workspace-id>)
```

> **Warning**: Deleting a workspace permanently removes all associated virtual machines and data.

---

## Accessing the VM Console

You can access the console of any virtual machine in a workspace directly from your browser using a WebSocket connection.

### Connection Details

- **Protocol**: WebSocket (`wss://`)
- **Endpoint**: `/api/VNC/Workspaces(<workspace-id>)/VirtualMachineConsole(<vmid>)`
- **Authentication**: Pass your JWT token as a `token` query parameter

**Example URL**:
```
wss://<host>:7078/api/VNC/Workspaces(3fa85f64-...)/VirtualMachineConsole(100)?token=<jwt>
```

The console session is proxied directly to the Proxmox VNC session for the virtual machine, providing real-time keyboard and screen access.

---

## Filtering and Searching

All list endpoints support OData query options for filtering and sorting.

### Examples

**Filter workspaces by name:**
```
GET /odata/Workspaces?$filter=name eq 'Training Lab 1'
```

**Get only the first 5 sites:**
```
GET /odata/Sites?$top=5
```

**Sort organizations alphabetically:**
```
GET /odata/Organizations?$orderby=name asc
```

**Select specific fields only:**
```
GET /odata/Workspaces?$select=id,name
```

**Count total records:**
```
GET /odata/Workspaces?$count=true
```

---

## Viewing Activity Logs

Activity logs record actions taken within the system.

```http
GET /odata/ActivityLogs
```

You can filter logs by date or user using OData query options:

```
GET /odata/ActivityLogs?$filter=userId eq '<user-id>'&$orderby=timestamp desc&$top=50
```

---

## Troubleshooting

### 401 Unauthorized

Your token is missing, expired, or invalid. Obtain a new token from your Azure AD sign-in flow and retry.

### 403 Forbidden

You are authenticated but do not have the required role for this operation. Contact your administrator to request the appropriate role.

### 404 Not Found

The resource you requested does not exist. Verify the ID in your request.

### 400 Bad Request

Your request body is missing required fields or contains invalid values. Check the error detail in the response body for specifics.

### WebSocket Connection Fails

- Ensure you are using `wss://` (not `https://`)
- Confirm your JWT token is valid and not expired
- Verify the workspace ID and VM ID are correct
- Check that the Proxmox node hosting the workspace is online
