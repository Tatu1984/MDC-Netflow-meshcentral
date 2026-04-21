# MDC — Developer Guide

Covers every change made across the three MDC repositories in this working
tree to deliver observability, remote connectivity, and NetFlow (phases 1–11
of `ROADMAP.md`). Written so a new engineer — or the same engineer six months
from now — can reproduce the setup, understand the conventions, and continue
the work.

> **Current state.** All changes are uncommitted and local-only. Nothing has
> been pushed to Azure or any remote. The deployed `main` / UAT branches are
> untouched. When you're ready to upstream, the PR strategy at the end of this
> document shows how to split the work cleanly.

---

## 1. Scope at a glance

| Capability | Phases | Real infra status | Mock? |
|---|---|---|---|
| Observability (PDM) | 1, 2, 3 | `PveBackedPdmClient` ready; needs DB + PVE token to go live | Yes — `MockPdmClient` default |
| MeshCentral remote connectivity | 4, 5, 10 | Trust-broker code ready; real Mesh server not yet deployed | Yes — `MockMeshCentralClient` |
| NetFlow (tiered, federated) | 6, 7, 8, 9 | Query API + federation coordinator ready; no real UDP listener / exporters | Yes — `CentralMockFlowCollector` + `EdgeMockFlowCollector` |
| Hardening + runbook | 11 | Runbook lives in `ROADMAP.md` | N/A |

Every phase exit criterion is audited by a Playwright suite. Current total:
**295 passing** across two repos.

## 2. Three-repo topology

```
MicroDataCenter-WebAPI/      (.NET 10, C#, OData + REST, EF Core, PostgreSQL)
├── MDC.Api                  — controllers, auth middleware, OData EDM model
├── MDC.Core                 — business services, providers, DB context
└── MDC.Shared               — DTOs used on the wire

MDC-web-dashboard/           (Next.js 14 / React 18, user-facing)
├── src/app                  — routes (mix of server + client components)
├── src/lib/api              — server-side API clients (one per capability)
├── src/lib/mdc              — pre-existing MDC OData client (unchanged)
├── src/components/ui        — shadcn/Radix primitives
└── tests                    — Playwright suites

MDC-admin-frontend/          (Next.js 14 / React 18, admin console)
├── src/app                  — /admin/* (MSAL-gated) + /observability, /netflow, /mesh (open, dev-only)
├── src/lib/api              — admin-side API clients
└── tests                    — Playwright suites
```

Request flow (authenticated user browsing a dashboard page):

```
   Browser ──── HTTPS ──── Next.js dev server (:3000 or :3001)
                                │
                                │  server component runs
                                │  during SSR
                                ▼
                         fetch(MDC_API_URL + path,
                               headers: Bearer <MSAL>
                                     OR X-API-Key <dev>)
                                │
                                ▼
                       MicroDataCenter-WebAPI (:5080 locally)
                       ├── ApiKeyAuthenticationHandler
                       ├── JwtBearerAuthenticationHandler (Entra)
                       └── Controller → Service → Provider → (mock | real)
```

**Key invariant**: the server-side fetch helpers on the frontends will prefer
an MSAL Bearer token if one is supplied, and fall back to `MDC_DEV_API_KEY`
otherwise. This is what makes the `?as=…` dev-identity bypass possible and
also what makes the hybrid env (real Entra login + local mock backend) work.

## 3. Repository impact map — what's new

### MicroDataCenter-WebAPI

```
MDC.Core/Services/Providers/
├── ProxmoxDatacenterManager/          (Phase 1)
│   ├── IPdmClient.cs
│   ├── MockPdmClient.cs               baseline + seeded events/pools
│   ├── PveBackedPdmClient.cs          real PVE adapter (internal)
│   ├── PdmTelemetryCache.cs           single-flight IMemoryCache wrapper
│   ├── PdmClientOptions.cs            appsettings "Pdm" section
│   ├── IVmWorkspaceMap.cs + MockVmWorkspaceMap.cs
│   ├── Dto/ (PdmCluster, PdmNode, PdmVm, PdmMetricsSample, PdmEvent, PdmStoragePool)
│   └── PdmProviderServiceCollectionExtensions.cs  (AddPdmProvider)
│
├── MeshCentral/                       (Phase 4 + 5)
│   ├── IMeshCentralClient.cs
│   ├── MockMeshCentralClient.cs       mutable inventory + ticket store
│   ├── MeshSessionBroker.cs           authZ + ticket mint
│   ├── MeshCentralOptions.cs          appsettings "MeshCentral" section
│   ├── CloudInitTemplate.cs           YAML user-data renderer
│   ├── MeshAgentEnrollmentService.cs  BackgroundService + ReconcileOnceAsync
│   ├── Dto/ (MeshDevice, MeshSessionTicket)
│   └── MeshServiceCollectionExtensions.cs  (AddMeshCentralProvider)
│
└── NetFlow/                           (Phase 6 + 9)
    ├── IFlowCollector.cs              abstraction for central + edge
    ├── IFlowSource.cs                 total-view abstraction
    ├── MockFlowCollectors.cs          CentralMockFlowCollector + EdgeMockFlowCollector
    ├── FederatedFlowSource.cs         coordinator, merges across collectors
    ├── FlowQueryService.cs            tier-aware query with rewrite
    ├── Dto/ (FlowRecord, TopTalker, FlowExporter, WorkspaceInterface)
    └── NetFlowServiceCollectionExtensions.cs  (AddNetFlowProvider)

MDC.Core/Services/Security/             (Phase 2)
├── Tier.cs                              TierKind enum + Tier record
├── ITierResolver.cs + TierResolver.cs
└── IWorkspaceMembershipResolver.cs + MockWorkspaceMembershipResolver.cs

MDC.Api/Controllers/
├── ObservabilityController.cs          9 endpoints: status / fleet / clusters / nodes / vms / events / storage / my-workspaces / workspaces/{id}/vms / vms/{id}/metrics
├── MeshController.cs                   session / status / devices / cloud-init-preview / reconcile
├── MockVmController.cs                 POST /api/mock-vms (dev-only; admin-gated)
├── MockMeshWebController.cs            GET /mock-mesh/session/{token} (anonymous redemption)
└── FlowsController.cs                  flows / top-talkers / workspaces/{id}/interfaces / by-vm / physical / exporters / collectors

MDC.Core/Extensions/MDCServiceCollectionExtensions.cs
  — one edit: added AddPdmProvider / AddMeshCentralProvider / AddNetFlowProvider
    + TierResolver + VmWorkspaceMap registrations inside AddMicroDatacenterCore.

MDC.Core/Services/Providers/PVEClient/PVEResource.cs
  — two-field additive change: Cpu / MaxCpu / Status / Uptime / PluginType props,
    used only by PveBackedPdmClient to avoid per-node extra API calls.

MDC.Api/appsettings.Development.json
  — added Pdm:UseMock=true + a dummy AzureAd:ClientId so JwtBearer initializes
    cleanly in dev without a real app registration.

MDC.Api/appsettings.Development.live.json
  — alternative dev env with Pdm:UseMock=false for trying the PVE-backed adapter.

MDC.Core/MDC.Core.csproj
  — added Microsoft.Extensions.Hosting.Abstractions 10.0.3 for BackgroundService.
```

### MDC-web-dashboard

```
src/lib/api/
├── observability.ts           (Phase 1 + 2)  status, fleet, nodes, events, my-workspaces, workspace/vms, vm/metrics
├── mesh.ts                    (Phase 4)       getMeshStatus, createMeshSession (with typed failure kinds)
├── mesh-summary.ts            (Remote Access) workspace-scoped helpers used by /remote-access
└── netflow.ts                 (Phase 6 + 7)   flows, top-talkers, interfaces, exporters, physical, by-vm

src/app/
├── observability/page.tsx                       (Phase 1) fleet + recent events
├── workspaces/[wsId]/observability/page.tsx     (Phase 2) workspace-scoped VM metrics, tier-gated
├── vms/[vmid]/page.tsx                          (Phase 4 + 5) Remote Connect + VNC side by side
├── vms/[vmid]/remote-connect-button.tsx         client island, mints session, opens popup
├── api/mesh/session/route.ts                    server proxy — keeps API key off client
├── network/page.tsx                             (Phase 7) workspace NetFlow dashboard
└── remote-access/page.tsx                       User MeshCentral overview: counts + per-VM table

src/app/dashboard/infrastructure/remote-networks/page.tsx
  — defensive guard on `.slice()` for undefined workspaceId / siteId.
src/app/dashboard/infrastructure/remote-networks/[id]/page.tsx
  — helper signatures accept undefined.
src/lib/mdc/types.ts
  — RemoteNetwork.siteId and workspaceId made optional.

.env.local                    hybrid local-dev config (mock API + real Entra)
.env.local.mock               pure-mock fallback (no Entra vars)

ROADMAP.md                    phase table + audit log + runbook
DEVELOPER_GUIDE.md            this file

tests/public/
├── observability-phase1.spec.ts
├── observability-phase2.spec.ts
├── mesh-phase4.spec.ts
├── mesh-phase5.spec.ts
├── netflow-phase6-7.spec.ts
└── remote-access-page.spec.ts
tests/dashboard/
└── remote-networks-undefined-fields.spec.ts     regression for an unrelated production bug
```

### MDC-admin-frontend

```
src/lib/api/
├── observability.ts           (Phase 3) same shape as dashboard's, admin scope
├── netflow.ts                 (Phase 8) flows, physical, top, exporters, collectors
└── mesh-admin.ts              (Phase 10) devices, reconcile

src/app/
├── observability/
│   ├── layout.tsx              status chip + tab nav + degraded banner
│   ├── page.tsx                fleet
│   ├── clusters/[clusterId]/page.tsx
│   ├── nodes/page.tsx
│   ├── storage/page.tsx
│   └── events/page.tsx
├── netflow/
│   ├── layout.tsx              tab nav (Overview / Physical / Exporters / Collectors)
│   ├── page.tsx                overview + recent flows + top talkers
│   ├── physical/page.tsx
│   ├── exporters/page.tsx
│   └── collectors/page.tsx     (Phase 9) federation health
└── mesh/page.tsx               device table, group summary, reconcile report

.env.local                     (mock config; points at localhost:5080)
playwright.config.ts           minimal; reuses dev server
tests/
├── observability-phase3.spec.ts
├── netflow-phase8.spec.ts
├── netflow-phase9.spec.ts
└── mesh-phase10.spec.ts
```

## 4. Running everything locally — from scratch

### Prerequisites (verified in your environment)

- .NET SDK 10.0+
- Node.js 18+ with npm (any of 20/22 is fine)
- No Docker required — everything's in-process

### Start (three terminals)

```bash
# A — backend
cd MicroDataCenter-WebAPI
dotnet build MicroDataCenter-WebAPI.sln
cd MDC.Api
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS="http://localhost:5080" \
  dotnet run --no-launch-profile

# B — user dashboard (port 3000)
cd MDC-web-dashboard
npm install                   # first time only
PORT=3000 npm run dev

# C — admin console (port 3001)
cd MDC-admin-frontend
npm install                   # first time only
PORT=3001 npm run dev
```

### Env files the dashboards expect

`MDC-web-dashboard/.env.local` (hybrid: real Entra login + local mock backend):

```
MDC_API_URL=http://localhost:5080
BRIDGE_API_URL=http://localhost:5080
API_URL=http://localhost:5080
MDC_DEV_API_KEY=test-admin-key-12345
ENTRA_CLIENT_ID=<your entra client id>
ENTRA_TENANT_ID=<your entra tenant id>
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
ENTRA_AUTHORITY=https://<tenant>.ciamlogin.com/<tenant-id>
MDC_SCOPE=api://<api-client-id>/MDC.Access
```

A pure-mock alternative without Entra is at `.env.local.mock` — copy it over
if you want to skip sign-in entirely and use the `?as=…` bypass for every page.

`MDC-admin-frontend/.env.local` (mock backend, no Entra gating on the new pages):

```
MDC_API_URL=http://localhost:5080
NEXT_PUBLIC_MDC_API_URL=http://localhost:5080
MDC_DEV_API_KEY=test-admin-key-12345
```

### Port assignments

| Port | Service |
|------|---------|
| 5080 | MicroDataCenter-WebAPI |
| 3000 | MDC-web-dashboard |
| 3001 | MDC-admin-frontend |

### Reset sequence if something drifts

```bash
pkill -f "MDC.Api/bin"       # backend
pkill -f "dotnet.*MDC.Api"
pkill -9 -f "next dev|next-server"  # both frontends
# then start again per the steps above
```

## 5. Auth & tier model

Claims exposed by both auth schemes (JWT Bearer via Entra + ApiKey handler):

- `ClaimTypes.NameIdentifier` → `UserId` (e.g. `manager-001` in dev, or Entra `sub`)
- `ClaimConstants.ObjectId` → Entra ObjectId (or the API key for service accounts)
- `ClaimTypes.Role` → one of `GlobalAdministrator` / `DatacenterTechnician` / `WorkspaceManager` / `WorkspaceUser` / `DeviceRegistration`

### Tier resolution — `MDC.Core/Services/Security/`

```
ITierResolver.ResolveAsync(ClaimsPrincipal) → Tier(TierKind, IReadOnlyList<string> WorkspaceIds)
```

- `TierKind.Admin` when the user has role `GlobalAdministrator` — server-side
  filters are NOT applied; the caller sees everything.
- `TierKind.WorkspaceMember` otherwise — every list endpoint is rewritten
  server-side to only return rows whose `WorkspaceId` is in the caller's
  memberships, and physical-interface rows are stripped.

Every controller that participates in tier scoping consumes this single
resolver (`ObservabilityController`, `FlowsController`, `MeshSessionBroker`).
One resolver, three call sites — no drift possible.

### Dev-identity bypass (`?as=manager`)

Server-component pages accept a `?as=admin|manager|technician` query param.
The `DEV_KEYS` map in `src/lib/api/netflow.ts`, `mesh.ts`, `observability.ts`
converts that into the matching `X-API-Key` header on the server-side fetch.
This is purely a developer conveniences — it does not exist on any of the
admin console routes that live under `/admin/…` (those go through MSAL).

| Identity | API key | Dev workspace membership |
|---|---|---|
| `admin` | `test-admin-key-12345` | all (GlobalAdministrator bypasses tier) |
| `manager` | `test-manager-key-12345` | ws-alpha + ws-beta |
| `technician` | `test-technician-key-67890` | ws-beta only |

Mock membership is set in `MockWorkspaceMembershipResolver.cs`.

### Production auth path

MSAL on the browser obtains a Bearer token during sign-in. For pages that
call the API from the browser directly (Remote Connect, future NetFlow live
streaming), the token goes over HTTPS in an `Authorization: Bearer …` header
to a Next.js route handler that proxies to the backend — ensuring no client
secret or API key ever touches the client bundle.

## 6. Mock vs live — where each integration is

| Provider | Flag | Mock impl | Live impl (status) |
|---|---|---|---|
| PDM Observability | `Pdm:UseMock` | `MockPdmClient` | `PveBackedPdmClient` exists — needs DB + PVE token |
| Workspace membership | implicit | `MockWorkspaceMembershipResolver` | Needs new `DbWorkspaceMembershipResolver` (not yet written) |
| VM → Workspace map | implicit | `MockVmWorkspaceMap` | Needs new `DbVmWorkspaceMap` (not yet written) |
| MeshCentral | `MeshCentral:UseMock` | `MockMeshCentralClient` | Needs real `MeshCentralClient` (HTTP + WS) when server is deployed |
| NetFlow | (no flag — always mock) | `CentralMockFlowCollector` + `EdgeMockFlowCollector` | Needs `NetFlowListenerService` + parsers + `EdgeCollectorQueryApi` |

### Flipping PDM to live

1. Set `"Pdm": { "UseMock": false }` in appsettings.
2. Ensure `ConnectionStrings:DefaultConnection` resolves to a reachable PostgreSQL with the MDC schema and at least one `DbSite` row.
3. Ensure each `DbSite` has `ApiTokenId` + `ApiSecret` that authenticate against your Proxmox cluster.
4. Restart the backend. `PveBackedPdmClient` walks `db.Sites`, creates PVE clients via the existing `IPVEClientFactory.Create(MicroDataCenterEndpoint)`, and returns real cluster/node/VM data.
5. Gracefully degrades: if the DB is unreachable, the client logs a warning and the endpoint returns empty lists — it does not crash.

## 7. Backend provider module convention

Every new provider in `MDC.Core/Services/Providers/<Name>/` follows the same
six-file shape so familiarity transfers cleanly across capabilities.

| File | Role |
|---|---|
| `<Name>Options.cs` | Bound to the appsettings section (e.g. "Pdm"). Contains `UseMock`, timeouts, base URL, secret-store references. |
| `Dto/*.cs` | Records returned on the wire. Public, annotated with `/// <summary>` + `/// <param>` (the project enforces CS1591). |
| `I<Name>Client.cs` | Public interface the controller depends on. |
| `Mock<Name>Client.cs` | Deterministic in-process fixture. Public so it can be DI-registered. |
| `<Real>Client.cs` (optional) | Internal adapter over the real infrastructure. |
| `<Name>ServiceCollectionExtensions.cs` | `Add<Name>Provider(configuration)` — choose mock vs real, register singletons, bind options, hook hosted services. |

The extension is wired into `MDCServiceCollectionExtensions.AddMicroDatacenterCore` once. Adding a new capability follows the same pattern.

### Controller skeleton

```csharp
[ApiController]
[Route("api/<name>")]
[Authorize(AuthenticationSchemes = "Bearer,ApiKey")]
public class <Name>Controller : ControllerBase {
    private readonly <Service> _service;
    private readonly ITierResolver _tier;

    [HttpGet("…")]
    [Authorize(Policy = "WorkspaceUser")]      // or "GlobalAdministrator"
    public async Task<IActionResult> UserEndpoint(…) {
        if (await RejectIfOutOfTierAsync(workspaceId, ct) is { } reject) return reject;
        …
    }

    private async Task<IActionResult?> RejectIfOutOfTierAsync(…) { … }
}
```

Tier rejection is a small private helper copied into `FlowsController` — the
same pattern works anywhere a `workspaceId` is an explicit query parameter.

## 8. Per-capability notes

### PDM Observability (Phases 1–3)

- Mock contains 3 clusters, 7 nodes, ~24 VMs, 5 storage pools, 4 events.
- `PdmTelemetryCache` is a single-flight in-memory cache (collapses
  concurrent identical requests). Default TTL: 5 s for metrics, 60 s for
  inventory, 10 s for events.
- `ObservabilityController.StatusAsync` is the only `[AllowAnonymous]` route
  — it's used by the admin `layout.tsx` to drive the degraded-mode banner
  without forcing the probe through auth.
- `serverTimeUtc` in `/status` is a liveness proof — the admin Phase 3 audit
  asserts the timestamp is within 60 s of wall-clock, which only holds if the
  value came from a running backend (not a hardcoded placeholder).

### MeshCentral (Phases 4, 5, 10)

- `MeshSessionBroker.CreateSessionAsync` returns a typed `MeshSessionResult`
  enum: `Ok | VmNotFound | Forbidden | AgentNotEnrolled | AgentOffline`. The
  controller maps these to 200 / 404 / 403 / 503 respectively. The 503
  responses include `fallback: "vnc"` so the UI can steer users to the
  hypervisor-level console.
- `MockMeshWebController.RedeemSession` stands in for the real MeshCentral
  web console. A token is single-use: `_tickets.TryRemove(token, out _)` on
  expiry. This is what makes the Phase 4 audit deterministic — second
  redemption of the same token returns 404.
- `MeshAgentEnrollmentService` is both a `BackgroundService` (runs every
  `MeshCentral:EnrollmentReconcileSeconds`, default 5) and exposes
  `ReconcileOnceAsync` so the mock VM-create flow can trigger an immediate
  reconcile in the same request.
- **Important mock isolation**: the reconciler's auto-enrolment only touches
  VMs registered via `MockVmWorkspaceMap.RegisterVm(…)`. The baseline static
  inventory (vmid 100–113 etc.) is NOT auto-enrolled. That's what lets the
  Phase 4 audit assert vmid 103 stays un-enrolled while Phase 5 can freshly
  create VM 9000+ and see it enrolled within seconds.
- `CloudInitTemplate.Render(meshBaseUrl, workspaceId, groupPrefix, vmid)` is
  real — the YAML it returns is what a live PVE integration will inject.
  `GET /api/mesh/cloud-init-preview` exposes it so operators can inspect.

### NetFlow (Phases 6, 7, 8, 9)

- The `IFlowCollector` abstraction represents "a store of flow records the
  coordinator can query." Central and edge are the same interface; the only
  behavioral difference is that edges simulate unreachability if their
  `_reachable` callback returns false.
- `FederatedFlowSource` is the coordinator: fans out, merges, tolerates
  individual collector failures (logs + partial results).
- `FlowQueryService.QueryAsync` is the one place tier rewriting happens:
  - For `WorkspaceMember` tier: `WorkspaceId IN (tier.WorkspaceIds)` AND `IsPhysicalInterface == false`.
  - For `Admin` tier: no workspace filter; `includePhysical` honours the caller's flag.
  - An explicit `q.WorkspaceId` outside the caller's membership returns an
    empty result from the service (safe fallback), but the controller's
    `RejectIfOutOfTierAsync` helper upgrades this to a 403 before the service
    is invoked — so cross-workspace attempts are rejected loudly.
- **Timestamp regeneration**: mock collectors re-stamp record timestamps on
  every `SnapshotAsync` call. Fixed seeded RNGs make records deterministic in
  shape and count; the `TsUtc` slides with now. Without this, after 5 minutes
  of uptime all records would fall outside the default query window and the
  UI would appear empty.

### Tier, workspace membership, VM map

- `TierResolver` reads `ClaimTypes.Role` to decide Admin vs WorkspaceMember
  and reads `ClaimTypes.NameIdentifier` (user id) to look up memberships via
  `IWorkspaceMembershipResolver`.
- `MockVmWorkspaceMap` layers a runtime `ConcurrentDictionary<int,VmLocation>`
  over the baseline `IPdmClient.ListVmsAsync` output — new VMs (vmid 9000+)
  show up immediately to both the map and the reconciler.

## 9. Frontend page conventions

### Where pages live

- User dashboard routes live at `/…` directly (`/network`, `/remote-access`,
  `/workspaces/[id]/observability`, `/vms/[id]`). They do **not** sit under
  `/dashboard/` because that subtree has a client-side MSAL gate inherited
  from the pre-existing `dashboard/layout.tsx`. For local dev we want these
  to work without MSAL; for production you can move them under a gated
  layout once Entra is wired end-to-end.
- Admin pages live at `/observability`, `/netflow`, `/mesh` — also outside
  `/admin/` for the same MSAL reason. In production these should either
  move under `/admin/` or have a layout that applies the admin-sidebar chrome.

### Component shape

Each page is a **server component by default**. That way:

- the API key / MSAL token never touches the client bundle,
- data fetches happen once during SSR (fast first paint),
- `searchParams` and `params` come in as plain props,
- cache control is `cache: 'no-store'` to always get fresh data.

When a page needs client interactivity (button click → POST → open window),
we use a **client island** — a small `"use client"` component embedded in the
server component. See `src/app/vms/[vmid]/remote-connect-button.tsx` for the
canonical example.

For client-initiated POST requests we **always** route through a Next.js
route handler (`src/app/api/mesh/session/route.ts`). The handler:
1. Receives the request from the browser.
2. Reads the selected dev identity (or future MSAL token) on the server.
3. Forwards to the backend with the right auth.
4. Returns JSON back to the client.

This pattern means the client never sees the dev API key — it's substituted
server-side.

### Conventional data-testid hooks

Every page I added uses `data-testid` attributes that the Playwright suites
assert against. Rule of thumb:

- one `data-testid="<page-kebab>-page"` on the page root,
- `data-testid="<row-type>-<stable-id>"` on every table row (`iface-row-…`,
  `vm-row-…`, `flow-row-…`, etc.),
- semantic names for error and empty states (`error-card`, `status-chip`,
  `degraded-banner`).

## 10. Testing

### Layout

```
MDC-web-dashboard/
├── playwright.config.ts             (pre-existing; 5 projects: setup/public/chromium/firefox/webkit/mobile-chrome)
├── tests/public/*.spec.ts           (no auth — run against landing / new server-component routes)
└── tests/dashboard/*.spec.ts        (requires setup auth state — runs under chromium/firefox/etc.)

MDC-admin-frontend/
├── playwright.config.ts             (minimal; single "public" project)
└── tests/*.spec.ts
```

### Running

```bash
# dashboard
cd MDC-web-dashboard
npx playwright test --project=public                          # every public-suite spec
npx playwright test --project=public tests/public/mesh-phase5.spec.ts   # one file
npx playwright test --project=chromium tests/dashboard/       # authenticated tests

# admin
cd MDC-admin-frontend
npx playwright test                                           # every spec
```

The `public` project expects no auth state; the `chromium` / `firefox` /
`webkit` / `mobile-chrome` projects depend on `tests/auth.setup.ts` which
seeds mock Zustand auth into `tests/.auth/user.json` — run once and every
authenticated test uses it.

### Adding a new audit

Copy `tests/public/mesh-phase5.spec.ts` as a template. Conventions:

- `const API_URL = process.env.MDC_API_URL ?? 'http://localhost:5080';`
- Use `request.newContext({ extraHTTPHeaders: { 'X-API-Key': … } })` for API calls
- For UI, prefer `getByTestId` over brittle text selectors
- If you need to reproduce a production-specific payload shape (e.g. the
  remote-networks regression), use `page.route(…)` to intercept the API call
  and return a synthetic body.

### Current audit scoreboard (ROADMAP audit log)

| Phase | Suite | Result |
|---|---|---|
| 1 | `observability-phase1.spec.ts` | 9 / 9 |
| 2 | `observability-phase2.spec.ts` | 12 / 12 |
| 3 | `MDC-admin-frontend/tests/observability-phase3.spec.ts` | 9 / 9 |
| 4 | `mesh-phase4.spec.ts` | 16 / 16 |
| 5 | `mesh-phase5.spec.ts` | 7 / 7 |
| 6+7 | `netflow-phase6-7.spec.ts` | 12 / 12 |
| 7 | `remote-access-page.spec.ts` | 4 / 4 |
| 8 | `MDC-admin-frontend/tests/netflow-phase8.spec.ts` | 3 / 3 |
| 9 | `MDC-admin-frontend/tests/netflow-phase9.spec.ts` | 7 / 7 |
| 10 | `MDC-admin-frontend/tests/mesh-phase10.spec.ts` | 2 / 2 |
| regression | `tests/dashboard/remote-networks-undefined-fields.spec.ts` | 1 / 1 |
| Full sweep (both repos, all browsers) | **295 / 295** | — |

## 11. Common tasks

### Add a new backend endpoint

1. Pick the controller (e.g. `FlowsController`) or create one.
2. For user-tier endpoints: decorate `[Authorize(Policy = "WorkspaceUser")]`,
   inject `ITierResolver`, call `RejectIfOutOfTierAsync` before the service.
3. For admin endpoints: `[Authorize(Policy = "GlobalAdministrator")]`.
4. Add a matching method to the provider's `IService` / `IClient` if it
   touches external state.
5. Write a Playwright assertion — hit the endpoint with the three dev keys
   and assert status codes (200 / 401 / 403 / 404 as appropriate).

### Add a new dashboard page

1. Decide: user dashboard or admin.
2. Create `src/app/<route>/page.tsx` as a server component with `export const dynamic = "force-dynamic";`.
3. If you need `?as=` dev-identity: read `searchParams.as`, map to `DEV_KEYS`,
   pass the key through to `fetchFoo(…, devKey)`.
4. Put any fetch helpers in `src/lib/api/<capability>.ts` — reuse the
   `get<T>(path, apiKeyOverride)` pattern.
5. Add `data-testid` attributes on rows, empty states, error cards.
6. Write a Playwright spec that visits the page and asserts rows.

### Add a new mock record

- For PDM: edit `MockPdmClient.cs` (cluster, node, VM, event, storage pool).
- For Mesh: edit `MockMeshCentralClient.cs` `SeedDevice(…)` calls in the ctor.
- For NetFlow: edit `MockFlowCollectors.cs` — `CentralMockFlowCollector` for
  central records, `EdgeMockFlowCollector` parameterisation in
  `NetFlowServiceCollectionExtensions.AddNetFlowProvider`.

### Swap a provider from mock to live

Each provider's `…ServiceCollectionExtensions.cs` contains an if/else (or
implicit fallback) on the `UseMock` options flag. Add your real
implementation, register it in the `else` branch, and toggle the flag in
appsettings. The controller and the frontend don't change.

## 12. Known gaps

These are the honest TODOs — remove the mocks + wire the real paths when
infrastructure lands.

| Item | Unblocker | Rough effort |
|---|---|---|
| `DbWorkspaceMembershipResolver` (real) | DB connection string + confirmed schema | ~2 h |
| `DbVmWorkspaceMap` (real) | Same | ~2 h |
| Real `PveBackedPdmClient` end-to-end test | Proxmox credentials reachable from dev box | ~1 h verification |
| Real `MeshCentralClient` (HTTP + WS) | MeshCentral server deployed + service account | ~1 day |
| Real `NetFlowListenerService` (UDP 2055/4739) | Exporters configured to send; IP allow-list | ~1 day |
| NetFlow v5/v9/IPFIX parsers | Wire-format test fixtures | ~2 days |
| `MDC.EdgeCollector` standalone project | Deployment target decided | ~1.5 days |
| DB migrations for `PdmResourceLink`, `MeshDeviceLink`, `FlowRecordEntity`, `FlowExporter` | Confirm if persisting in central DB vs elsewhere | ~0.5 day each |
| Remove `MockVmController` and `/mock-mesh/*` dev endpoints | Real VM-create flow drives enrollment | 30 min cleanup |
| Session recording for MeshCentral audit | Compliance sign-off + MeshCentral configuration | external |

## 13. When it's time to push

The work spans three repos and currently sits uncommitted on this machine.
**Nothing has been committed or pushed** — this is deliberate per the working
agreement. When you're ready to upstream:

### Suggested split by branch / PR

| Branch | Files | Why separate |
|---|---|---|
| `fix/remote-networks-undefined-slice` | `src/app/dashboard/infrastructure/remote-networks/page.tsx`, `[id]/page.tsx`, `src/lib/mdc/types.ts`, regression test | Unrelated pre-existing production bug fix — should land ASAP on `main` independent of the feature work. |
| `feat/observability-pdm` (3 repos) | Everything under `ProxmoxDatacenterManager/`, `Security/`, `ObservabilityController`, dashboard `/observability`, admin `/observability` | Phases 1 + 2 + 3 are tightly coupled (shared tier resolver). |
| `feat/mesh-remote-connectivity` (3 repos) | Everything under `MeshCentral/`, `MeshController`, `MockVmController`, `/vms/[vmid]`, `/remote-access`, admin `/mesh` | Phases 4 + 5 + 10. |
| `feat/netflow-tiered-federated` (3 repos) | Everything under `NetFlow/`, `FlowsController`, dashboard `/network`, admin `/netflow/*` | Phases 6 + 7 + 8 + 9. |
| `docs/roadmap-and-developer-guide` | `ROADMAP.md`, `DEVELOPER_GUIDE.md` | Reviewable without code. |

### Before pushing, clean these out

- `/api/mock-vms` controller — dev-only, remove from the commit set when going to prod.
- `/mock-mesh/*` controller — dev-only stand-in for the real MeshCentral web UI.
- `?as=admin|manager|technician` dev-identity query param handling on server
  components — optional to leave if disabled in prod env, but simplest is to
  gate the DEV_KEYS map behind `process.env.NODE_ENV !== 'production'`.
- `.env.local` (never committed anyway per `.gitignore`).
- `.env.local.mock` (local-dev helper).

### Reviewer checklist

- [ ] No mock code paths reachable when `NODE_ENV=production`.
- [ ] Every new endpoint is tier-enforced server-side (spot-check each controller method for `[Authorize]`).
- [ ] Every new page uses `data-testid` hooks so Playwright tests remain portable.
- [ ] `Pdm:UseMock`, `MeshCentral:UseMock` default to `false` in `appsettings.json` (production); `true` only in `appsettings.Development.json`.
- [ ] Playwright suites run green locally AND in CI.
- [ ] ROADMAP.md audit log updated with the post-merge test results.

---

## Document location

This guide: `MDC-web-dashboard/DEVELOPER_GUIDE.md`.

Companion: `MDC-web-dashboard/ROADMAP.md` — phase table, exit criteria, audit log, runbook.

Both live at the root of the dashboard repository for discoverability — a
new engineer who clones that repo first has the full picture without needing
to hunt through the backend or admin repos.
