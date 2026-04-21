# MDC — NetFlow + MeshCentral + Observability

Consolidated snapshot of the three MicroDataCenter platform projects with
Phases 1–11 of the observability / remote-access / NetFlow programme
implemented against a mock backend.

## Contents

| Directory | What it is |
|---|---|
| [`MicroDataCenter-WebAPI/`](./MicroDataCenter-WebAPI/) | .NET 10 / C# backend. OData + REST controllers, EF Core 10, PostgreSQL, dual JWT/API-key auth. Contains the new PDM, MeshCentral, and NetFlow provider modules plus their controllers. |
| [`MDC-web-dashboard/`](./MDC-web-dashboard/) | Next.js 14 user dashboard. Adds workspace-scoped observability, Remote Connect / VNC launcher, NetFlow per-interface view, and a Remote Access overview. |
| [`MDC-admin-frontend/`](./MDC-admin-frontend/) | Next.js 14 admin console. Adds fleet observability, admin NetFlow (overview / physical / exporters / federated collectors), and admin MeshCentral device management. |

## Start here

- [`MDC-web-dashboard/ROADMAP.md`](./MDC-web-dashboard/ROADMAP.md) — phase table, exit criteria, audit log, local-dev runbook.
- [`MDC-web-dashboard/DEVELOPER_GUIDE.md`](./MDC-web-dashboard/DEVELOPER_GUIDE.md) — architecture, conventions, common tasks, known gaps, push-strategy notes.
- [`MDC-web-dashboard/MDC_Technical_Implementation_Roadmap.docx`](./MDC-web-dashboard/MDC_Technical_Implementation_Roadmap.docx) — the technical document with embedded architecture diagrams.

## Running locally

Three terminals:

```bash
# backend (port 5080)
cd MicroDataCenter-WebAPI/MDC.Api
dotnet build
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS="http://localhost:5080" \
  dotnet run --no-launch-profile

# user dashboard (port 3000)
cd MDC-web-dashboard
cp .env.local.mock .env.local    # create this yourself — see template below
npm install && PORT=3000 npm run dev

# admin console (port 3001)
cd MDC-admin-frontend
# create .env.local — see template below
npm install && PORT=3001 npm run dev
```

Secrets are not committed. Each frontend needs a `.env.local` file. Minimum
mock-mode contents:

**`MDC-web-dashboard/.env.local`**
```
MDC_API_URL=http://localhost:5080
BRIDGE_API_URL=http://localhost:5080
API_URL=http://localhost:5080
MDC_DEV_API_KEY=test-admin-key-12345
```

**`MDC-admin-frontend/.env.local`**
```
MDC_API_URL=http://localhost:5080
NEXT_PUBLIC_MDC_API_URL=http://localhost:5080
MDC_DEV_API_KEY=test-admin-key-12345
```

For Entra ID sign-in on the dashboard, add:

```
ENTRA_CLIENT_ID=<your client id>
ENTRA_TENANT_ID=<your tenant id>
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
ENTRA_AUTHORITY=https://<tenant>.ciamlogin.com/<tenant-id>
MDC_SCOPE=api://<api-client-id>/MDC.Access
```

## Status

| Phase | Status |
|---|---|
| 1 — PDM backend thin slice | ✅ |
| 2 — User observability panel | ✅ |
| 3 — Admin observability section | ✅ |
| 4 — MeshCentral server + trust broker | ✅ |
| 5 — User Remote Connect UI + enrollment | ✅ |
| 6 — NetFlow central collector | ✅ |
| 7 — User NetFlow UI | ✅ |
| 8 — Admin NetFlow UI | ✅ |
| 9 — Edge NetFlow collector + federation | ✅ |
| 10 — Admin MeshCentral UI | ✅ |
| 11 — Hardening + runbook | ✅ |

**Playwright audit total: 295 / 295 passing** across both frontend repos.

## Honest caveats

Everything in this repo runs against **mock** implementations of PDM,
MeshCentral, and NetFlow. The `DEVELOPER_GUIDE.md` section 6 explains the
flags for switching to live adapters when the real infrastructure becomes
available (real Proxmox credentials for PDM, deployed MeshCentral server,
real NetFlow exporters configured to send).
