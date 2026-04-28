# Running the MDC stack on Ubuntu Desktop

A step-by-step guide for bringing up the three projects in this repo on a fresh
Ubuntu Desktop machine (tested against Ubuntu 22.04 LTS and 24.04 LTS).

The repo contains three folders that together make up the MicroDataCenter
platform:

| Folder | What it is | Port |
|---|---|---|
| `MicroDataCenter-WebAPI/` | .NET 10 backend (REST + OData, mock PDM/MeshCentral/NetFlow providers) | `5080` |
| `MDC-web-dashboard/` | Next.js 14 user dashboard | `3000` |
| `MDC-admin-frontend/` | Next.js 14 admin console | `3001` |

Everything runs against **mock** providers, so no real Proxmox, MeshCentral
server, or NetFlow exporters are required.

---

## 1. Install prerequisites

Run the following in any terminal. You only need to do this once per machine.

### 1.1 Update the package index

```bash
sudo apt update && sudo apt -y upgrade
```

### 1.2 Install build basics + git + curl

```bash
sudo apt -y install build-essential curl git ca-certificates gnupg lsb-release
```

### 1.3 Install the .NET 10 SDK

Microsoft ships .NET 10 through the `packages.microsoft.com` feed.

```bash
# add Microsoft package signing key + feed for your Ubuntu version
. /etc/os-release
wget https://packages.microsoft.com/config/ubuntu/${VERSION_ID}/packages-microsoft-prod.deb -O /tmp/ms.deb
sudo dpkg -i /tmp/ms.deb
rm /tmp/ms.deb

sudo apt update
sudo apt -y install dotnet-sdk-10.0
```

Verify:

```bash
dotnet --list-sdks
# expect a line like: 10.0.xxx [/usr/share/dotnet/sdk]
```

> If `dotnet-sdk-10.0` is not yet packaged for your Ubuntu version, install
> via the dotnet-install script instead:
> ```bash
> curl -sSL https://dot.net/v1/dotnet-install.sh -o dotnet-install.sh
> chmod +x dotnet-install.sh
> ./dotnet-install.sh --channel 10.0
> echo 'export DOTNET_ROOT=$HOME/.dotnet' >> ~/.bashrc
> echo 'export PATH=$PATH:$HOME/.dotnet' >> ~/.bashrc
> source ~/.bashrc
> ```

### 1.4 Install Node.js 20 LTS via nvm

The frontends are built against Node 20+. nvm avoids needing root.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# reload shell so nvm is on PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20
nvm alias default 20
```

Verify:

```bash
node -v   # v20.x.x
npm  -v   # 10.x.x
```

---

## 2. Clone the repository

Pick a working directory (the rest of this guide assumes `~/projects`).

```bash
mkdir -p ~/projects
cd ~/projects
git clone <your-repo-url> MDC-Netflow-meshcentral
cd MDC-Netflow-meshcentral
ls
# MDC-admin-frontend  MDC-web-dashboard  MicroDataCenter-WebAPI  README.md
```

---

## 3. Create the local environment files

The two frontends read connection details from `.env.local`. These files are
gitignored and must be created by hand.

### 3.1 User dashboard

```bash
cat > MDC-web-dashboard/.env.local <<'EOF'
MDC_API_URL=http://localhost:5080
BRIDGE_API_URL=http://localhost:5080
API_URL=http://localhost:5080
MDC_DEV_API_KEY=test-admin-key-12345
EOF
```

### 3.2 Admin console

```bash
cat > MDC-admin-frontend/.env.local <<'EOF'
MDC_API_URL=http://localhost:5080
NEXT_PUBLIC_MDC_API_URL=http://localhost:5080
MDC_DEV_API_KEY=test-admin-key-12345
EOF
```

> The dev API key (`test-admin-key-12345`) is the seeded mock-mode credential
> that the backend accepts in `Development`. Do **not** use it in any other
> environment.

---

## 4. Install dependencies

Run these three commands once. You can run them in parallel in separate
terminals if you like — they are independent.

```bash
# .NET — restores NuGet packages
cd ~/projects/MDC-Netflow-meshcentral/MicroDataCenter-WebAPI/MDC.Api
dotnet build

# user dashboard — installs node_modules
cd ~/projects/MDC-Netflow-meshcentral/MDC-web-dashboard
npm install

# admin console — installs node_modules
cd ~/projects/MDC-Netflow-meshcentral/MDC-admin-frontend
npm install
```

The `npm install` steps each take 1–3 minutes the first time.

---

## 5. Start the three services

You need **three terminals**, one per service. Order matters: start the
backend first so the frontends find it on their first request.

### Terminal 1 — Backend (port 5080)

```bash
cd ~/projects/MDC-Netflow-meshcentral/MicroDataCenter-WebAPI/MDC.Api
ASPNETCORE_ENVIRONMENT=Development \
ASPNETCORE_URLS="http://localhost:5080" \
dotnet run --no-launch-profile
```

You should see Kestrel log lines ending in:

```
Now listening on: http://localhost:5080
Application started. Press Ctrl+C to shut down.
```

Sanity check from another terminal:

```bash
curl -i http://localhost:5080/swagger
# HTTP/1.1 301 Moved Permanently   ← good
```

### Terminal 2 — User dashboard (port 3000)

```bash
cd ~/projects/MDC-Netflow-meshcentral/MDC-web-dashboard
PORT=3000 npm run dev
```

Wait for:

```
✓ Ready in <n>s
- Local:  http://localhost:3000
```

### Terminal 3 — Admin console (port 3001)

```bash
cd ~/projects/MDC-Netflow-meshcentral/MDC-admin-frontend
PORT=3001 npm run dev
```

Wait for:

```
✓ Ready in <n>s
- Local:  http://localhost:3001
```

---

## 6. Open the demo screens

With all three services running, browse to:

### User dashboard — http://localhost:3000

| Screen | URL |
|---|---|
| Remote Access overview (MeshCentral enrollment + VNC) | http://localhost:3000/remote-access |
| NetFlow per‑interface | http://localhost:3000/network |
| User observability | http://localhost:3000/observability |
| Workspace observability drill‑in | http://localhost:3000/workspaces/ws-001/observability |
| VM detail w/ Remote Connect launcher | http://localhost:3000/vms/100 |
| Login | http://localhost:3000/auth/login |

### Admin console — http://localhost:3001

| Screen | URL |
|---|---|
| Fleet observability | http://localhost:3001/observability |
| Per‑node observability | http://localhost:3001/observability/nodes |
| Admin NetFlow overview | http://localhost:3001/netflow |
| Admin NetFlow — physical interfaces | http://localhost:3001/netflow/physical |
| Admin NetFlow — exporters | http://localhost:3001/netflow/exporters |
| Admin NetFlow — federated collectors | http://localhost:3001/netflow/collectors |
| Admin MeshCentral device management | http://localhost:3001/mesh |
| Admin login | http://localhost:3001/auth/admin/login |

### Backend

| Resource | URL |
|---|---|
| Swagger UI | http://localhost:5080/swagger |
| OpenAPI JSON | http://localhost:5080/swagger/v1/swagger.json |

---

## 7. Stopping the stack

In each terminal press `Ctrl+C`. If a port is stuck (process didn't exit
cleanly):

```bash
# find and kill whatever is holding the port
sudo lsof -i :3000 -t | xargs -r kill
sudo lsof -i :3001 -t | xargs -r kill
sudo lsof -i :5080 -t | xargs -r kill
```

---

## 8. Optional: Entra ID login on the dashboard

The dashboard supports Entra ID (Azure AD) sign‑in. To enable it, append to
`MDC-web-dashboard/.env.local`:

```bash
ENTRA_CLIENT_ID=<your client id>
ENTRA_TENANT_ID=<your tenant id>
ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback
ENTRA_AUTHORITY=https://<tenant>.ciamlogin.com/<tenant-id>
MDC_SCOPE=api://<api-client-id>/MDC.Access
```

Then restart the dashboard (`Ctrl+C`, then `PORT=3000 npm run dev` again).
Without these, you can still hit every screen directly via URL — auth is
skipped in mock mode.

---

## 9. Troubleshooting

### "next: command not found"

`node_modules` is missing or got removed. Reinstall:

```bash
cd MDC-web-dashboard && npm install
cd ../MDC-admin-frontend && npm install
```

### Frontend returns HTTP 500 on every page

Almost always: the dev server was started **before** `.env.local` existed,
so `process.env.MDC_API_URL` is empty. Next.js loads `.env.local` once at
startup, so you must restart after creating or editing it.

```bash
# Ctrl+C in the dashboard terminal, then
PORT=3000 npm run dev
```

### Port already in use (`EADDRINUSE`)

Another process is on `3000` / `3001` / `5080`. Kill it:

```bash
sudo lsof -i :3000 -t | xargs -r kill -9
```

Or pick a different port: `PORT=3010 npm run dev`. If you change the
backend port, also update `MDC_API_URL` in both `.env.local` files and
restart the frontends.

### `dotnet: command not found`

The .NET install didn't add `dotnet` to your PATH. Either re-open the
terminal, or run:

```bash
export DOTNET_ROOT=$HOME/.dotnet
export PATH=$PATH:$HOME/.dotnet
```

### `dotnet build` fails with a target‑framework error

`net10.0` requires .NET SDK 10.x. Confirm with `dotnet --list-sdks`. If you
only see 8.x or 9.x, repeat step 1.3.

### Backend builds but immediately exits / port not bound

Run with the explicit URL flag (the launch profile sometimes binds an
unexpected port):

```bash
ASPNETCORE_URLS="http://localhost:5080" dotnet run --no-launch-profile
```

### Dashboard shows blank panels / "failed to fetch"

The backend isn't running, or the frontend points at the wrong URL.
Confirm both:

```bash
curl -i http://localhost:5080/swagger          # expect 301
grep MDC_API_URL MDC-web-dashboard/.env.local  # expect http://localhost:5080
```

---

## 10. What's next

- `MDC-web-dashboard/ROADMAP.md` — phase table, exit criteria, audit log.
- `MDC-web-dashboard/DEVELOPER_GUIDE.md` — architecture, conventions, and
  the flags for switching from mock providers to live PDM / MeshCentral /
  NetFlow adapters.
- `MicroDataCenter-WebAPI/postman/` — Postman collection for hitting the
  API directly with the dev API key.
