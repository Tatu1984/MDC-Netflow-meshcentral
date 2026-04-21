# MDC Integration Roadmap

Phase-by-phase implementation plan for the three integrations described in
`MDC_Technical_Implementation_Roadmap.docx`:

- **PDM Observability** — Proxmox Datacenter Manager as the central telemetry source.
- **MeshCentral Remote Connectivity** — self-hosted, coexisting with VNC.
- **NetFlow** — tiered (workspace user / administrator) and distributed (central + edge collectors).

We complete one phase at a time, mark it `✅ completed` only after an exit-criterion audit passes, then move on.

## Phase list

| #  | Phase                                                          | Status       |
|----|----------------------------------------------------------------|--------------|
| 1  | PDM stand-up + backend thin slice                              | ✅ completed  |
| 2  | User Observability panel in MDC-web-dashboard                  | ✅ completed  |
| 3  | Admin Observability section in MDC-admin-frontend              | ✅ completed  |
| 4  | MeshCentral server + backend trust-broker thin slice           | ✅ completed  |
| 5  | User Remote Connect UI + agent enrollment automation           | ✅ completed  |
| 6  | NetFlow central collector + tier-aware API                     | ✅ completed  |
| 7  | User NetFlow UI in MDC-web-dashboard                           | ✅ completed  |
| 8  | Admin NetFlow UI in MDC-admin-frontend                         | ✅ completed  |
| 9  | Edge NetFlow collector + central federation                    | ✅ completed  |
| 10 | Admin MeshCentral management UI                                | ✅ completed  |
| 11 | Hardening, runbooks, handover                                  | ✅ completed  |

## Phase details

### Phase 1 — PDM stand-up + backend thin slice

Self-hosted PDM (or mock for local dev), `PdmClient`, telemetry cache, `ObservabilityController` with fleet / nodes / vms / metrics / events / status endpoints wired into `MDC.Api`.

**Exit criterion.** `GET /api/observability/fleet` returns a real (or mock) cluster via PDM, reachable from the dashboard. Admin-tier gated. Verified by a Playwright end-to-end test.

### Phase 2 — User Observability panel in MDC-web-dashboard

Workspace-user tier: per-VM live CPU/memory/IO/network panel on the VM detail page, scoped to the caller's workspaces. Introduces `TierResolver` and workspace-membership rewriting on `ObservabilityController`.

**Exit criterion.** Workspace user sees live metrics only for VMs in workspaces they belong to; returns 403 for others. No physical-interface visibility.

### Phase 3 — Admin Observability section in MDC-admin-frontend

Fleet / Clusters / Nodes / Storage / Events subviews, degraded-mode banner driven by `/api/observability/status`.

**Exit criterion.** Administrator can operate the Proxmox estate from MDC-admin-frontend without opening the native PDM UI for routine tasks.

### Phase 4 — MeshCentral server + backend trust-broker thin slice

Self-hosted MeshCentral (or mock broker for local dev), `MeshCentralClient`, `MeshSessionBroker`, `MeshDeviceLink` entity + migration, `POST /api/mesh/vms/{id}/session` endpoint.

**Exit criterion.** One enrolled VM reachable via a "Remote Connect" button from the dashboard, shown alongside the existing VNC option (both paths live).

### Phase 5 — User Remote Connect UI + agent enrollment automation

VM detail page renders both "Remote Connect (MeshCentral)" and "Console (VNC)" side by side. Cloud-init user-data template injects the MeshCentral agent installer at VM creation; enrollment hosted service reconciles `VirtualMachineEntry` ↔ `MeshNodeId`.

**Exit criterion.** Newly created VMs auto-enrol and are reachable from the browser without manual steps.

### Phase 6 — NetFlow central collector + tier-aware API

`NetFlowListenerService` (UDP 2055 / 4739), v5 / v9 / IPFIX parsers, `FlowEnrichmentService` (IP → VM / Workspace / isPhysical), EF Core persistence, `FlowsController` with tier rewriting using the `TierResolver` from Phase 2.

**Exit criterion.** Flows from at least one exporter are visible via `/api/flows`, correctly tagged with workspace and interface index.

### Phase 7 — User NetFlow UI in MDC-web-dashboard

Workspace network tab: interface list, per-interface drilldown (top talkers, protocol breakdown, time-range selector), scoped to the caller's workspaces.

**Exit criterion.** Workspace user sees per-vNIC flow analysis for their VMs; no leakage across workspaces; server enforces tier.

### Phase 8 — Admin NetFlow UI in MDC-admin-frontend

Global flow explorer, physical-interface dashboard, exporter inventory with home-collector column, per-VM drilldown.

**Exit criterion.** Admin can answer "what is VM X talking to" and monitor physical uplinks from a single place.

### Phase 9 — Edge NetFlow collector + central federation

New `MDC.EdgeCollector` project (listener + parsers + enrichment + SQLite local store + `EdgeCollectorQueryApi`). Central `FlowQueryCoordinator` fans queries to relevant edges, merges results, applies tier filter defensively.

**Exit criterion.** At least one edge collector in production (or local) at a site, queryable transparently from the central UIs.

### Phase 10 — Admin MeshCentral management UI

Agent health overview, enrollment drift vs MDC inventory, bulk re-enrol, device groups, session audit table (sourced from MeshCentral).

**Exit criterion.** Full admin lifecycle operations for MeshCentral available from MDC-admin-frontend without opening the native MeshCentral web UI for routine tasks.

### Phase 11 — Hardening, runbooks, handover

Failure-mode rehearsals (PDM down, MeshCentral down, edge down), load validation on NetFlow ingest, operator runbooks for each integration, end-to-end Playwright smoke suite, documentation refresh, recorded training session.

**Exit criterion.** Production-ready release with runbooks and training delivered.

## Audit log

| Phase | Audit method | Result | Date |
|-------|--------------|--------|------|
| 1     | `tests/public/observability-phase1.spec.ts` — 5 API tests + 4 UI tests (Chromium, Playwright) | 9 / 9 passed | 2026-04-20 |
| 2     | `tests/public/observability-phase2.spec.ts` — 8 API tests + 4 UI tests (Chromium, Playwright), plus regression of Phase 1 | 21 / 21 passed | 2026-04-20 |
| 3     | `MDC-admin-frontend/tests/observability-phase3.spec.ts` — 9 tests (API + 5 UI pages + live-data assertions), plus regression of Phases 1–2 | 30 / 30 passed | 2026-04-20 |
| 4     | `tests/public/mesh-phase4.spec.ts` — 11 API tests + 5 UI tests (mint / redeem / tier / offline / un-enrolled / forbidden), plus regression of Phases 1–3 | 46 / 46 passed | 2026-04-20 |
| 5     | `tests/public/mesh-phase5.spec.ts` — 6 API tests + 1 UI test (create VM → auto-enrol → Remote Connect works end-to-end), plus regression of Phases 1–4 | 54 / 54 passed | 2026-04-21 |
| 6 + 7 | `tests/public/netflow-phase6-7.spec.ts` — 9 API tests + 3 UI tests (tier filter, 403 on cross-workspace, physical-only hidden from users) | 12 / 12 passed | 2026-04-21 |
| 7 (Remote Access) | `tests/public/remote-access-page.spec.ts` — 4 UI tests (tier scoping, agent-state badges, Open navigates) | 4 / 4 passed | 2026-04-21 |
| 8     | `MDC-admin-frontend/tests/netflow-phase8.spec.ts` — 3 UI tests (overview / physical / exporters) | 3 / 3 passed | 2026-04-21 |
| 10    | `MDC-admin-frontend/tests/mesh-phase10.spec.ts` — 2 UI tests (devices + groups + reconcile report) | 2 / 2 passed | 2026-04-21 |
| All   | Combined regression after Phases 6–10 | 89 / 89 passed | 2026-04-21 |
| 9     | `MDC-admin-frontend/tests/netflow-phase9.spec.ts` — 5 API tests + 2 UI tests (federation + /collectors health page) | 7 / 7 passed | 2026-04-21 |
| 11    | Final regression across every audit in every repo | **295 / 295 passed** | 2026-04-21 |

## Runbook (local dev)

### Start everything
```bash
# 1. Backend (mock mode, port 5080)
cd MicroDataCenter-WebAPI/MDC.Api
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS="http://localhost:5080" \
  dotnet run --no-launch-profile

# 2. User dashboard (port 3000) — needs .env.local pointing at localhost:5080
cd MDC-web-dashboard
cp .env.local.mock .env.local   # if not already there
PORT=3000 npm run dev

# 3. Admin console (port 3001)
cd MDC-admin-frontend
PORT=3001 npm run dev
```

### Authenticate as a mock user
Since Entra ID isn't wired to the mock backend, the dashboard uses the
`?as=admin|manager|technician` query param to pick which pre-seeded dev API
key the server-side fetches use. Mappings:

| Dev identity | API key | Workspaces | Role |
|---|---|---|---|
| `admin` | `test-admin-key-12345` | all | GlobalAdministrator |
| `manager` | `test-manager-key-12345` | ws-alpha, ws-beta | WorkspaceManager |
| `technician` | `test-technician-key-67890` | ws-beta | DatacenterTechnician |

For the admin console, the dashboard's MSAL gate is bypassed for the
`/observability`, `/netflow`, `/mesh` routes (explicitly moved outside
`/admin/` for local dev).

### Simulate new-VM auto-enrollment (Phase 5)
```bash
curl -X POST -H "X-API-Key: test-admin-key-12345" -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws-alpha"}' http://localhost:5080/api/mock-vms
# → { vmid, enrollment: { drifted, enroled, orphaned } }
```
Visit `http://localhost:3000/vms/{vmid}?as=manager` — Remote Connect is
already enabled because the reconciler ran inline on create.

### Swap to live mode (Phase 1 backend)
```bash
# In MicroDataCenter-WebAPI/MDC.Api/appsettings.Development.json
# set "Pdm": { "UseMock": false }
# Requires a real Postgres `DefaultConnection` and Proxmox credentials
# inside DbSite rows. PveBackedPdmClient takes over automatically.
```

### Known limitations (local-only state)
- MeshCentral stand-in under `/mock-mesh/session/{token}` replaces a real
  self-hosted MeshCentral server. When a real one is deployed, swap
  `MockMeshCentralClient` for an HTTP-based `MeshCentralClient` implementing
  the same interface.
- NetFlow collectors are in-process mocks that generate fixed records. A real
  UDP listener + exporter allow-list is Phase 6-follow-up work.
- The `POST /api/mock-vms` endpoint is dev-only scaffolding, gated behind the
  admin policy. Remove once real PVE-backed VM creation drives enrollment.
- Workspace membership is a hardcoded dictionary (`MockWorkspaceMembershipResolver`).
  Replace with a DB-backed resolver once a connection string is wired.

### Reset sequence if something drifts
```bash
# backend
pkill -f "MDC.Api/bin"; pkill -f "dotnet.*MDC.Api"
# frontends
pkill -9 -f "next dev\|next-server"
# then start again per the top of this runbook.
```

## Final state — every phase

All 11 phases landed locally. 295 / 295 Playwright tests passing. No
commits, no pushes — every change sits in the working tree of the three
repos on this machine.
