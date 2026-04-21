"""Generate all technical diagrams (PNG) used by the implementation roadmap document."""

from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
from matplotlib.lines import Line2D

OUT = Path(__file__).parent / "out"
OUT.mkdir(exist_ok=True)

FILL = "#E8F1FA"
EDGE = "#1F4E79"
ACCENT = "#1F4E79"
MUTED = "#666666"
WARN = "#B36A00"
OK = "#2E7D32"


def save(fig, name):
    path = OUT / name
    fig.savefig(path, dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  wrote {path}")
    return path


def box(ax, x, y, w, h, label, fill=FILL, edge=EDGE, fontsize=9, bold=False):
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle="round,pad=0.02,rounding_size=0.08",
                       linewidth=1.2, edgecolor=edge, facecolor=fill)
    ax.add_patch(p)
    weight = "bold" if bold else "normal"
    ax.text(x + w / 2, y + h / 2, label, ha="center", va="center",
            fontsize=fontsize, fontweight=weight, color="#111", wrap=True)


def arrow(ax, x1, y1, x2, y2, label=None, color=MUTED, style="-|>", ls="-", fontsize=8, label_offset=(0, 0.1)):
    a = FancyArrowPatch((x1, y1), (x2, y2),
                        arrowstyle=style, mutation_scale=12,
                        linewidth=1.2, color=color, linestyle=ls)
    ax.add_patch(a)
    if label:
        mx = (x1 + x2) / 2 + label_offset[0]
        my = (y1 + y2) / 2 + label_offset[1]
        ax.text(mx, my, label, ha="center", va="center", fontsize=fontsize,
                color=color, bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="none", alpha=0.9))


def title(ax, text):
    ax.set_title(text, fontsize=12, fontweight="bold", color=ACCENT, loc="left", pad=10)


def clean(ax, xlim, ylim):
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.set_aspect("equal")
    ax.axis("off")


# ------------------------------------------------------------
# 1. System overview
# ------------------------------------------------------------

def system_overview():
    fig, ax = plt.subplots(figsize=(12, 7))

    # Browsers
    box(ax, 0.5, 9, 3.0, 0.9, "Workspace User\n(browser)", fill="#FFF5E0", edge=WARN)
    box(ax, 8.5, 9, 3.0, 0.9, "Administrator\n(browser)", fill="#FFF5E0", edge=WARN)

    # Frontends
    box(ax, 0.2, 7.2, 3.6, 1.1, "MDC-web-dashboard\nNext.js 14 / React 18\nMSAL (Entra ID)", bold=True)
    box(ax, 8.2, 7.2, 3.6, 1.1, "MDC-admin-frontend\nNext.js 14 / React 18\nMSAL (Entra ID)", bold=True)

    # Backend
    box(ax, 3.5, 5.0, 5.0, 1.3,
        "MicroDataCenter-WebAPI (.NET 10 / C#)\nControllers + OData  ·  JWT Bearer + API Key\nEF Core 10  ·  WebSocket VNC relay",
        bold=True, fill="#DCE7F2")

    # Providers layer inside backend (conceptual)
    box(ax, 0.2, 2.9, 2.3, 1.3, "PVEClient\n(existing)", fill="#F2F2F2")
    box(ax, 2.7, 2.9, 2.3, 1.3, "PDM provider\n(NEW)", fill="#E8F5E9", edge=OK)
    box(ax, 5.2, 2.9, 2.3, 1.3, "MeshCentral\nprovider (NEW)", fill="#E8F5E9", edge=OK)
    box(ax, 7.7, 2.9, 2.3, 1.3, "NetFlow central\ncollector (NEW)", fill="#E8F5E9", edge=OK)
    box(ax, 10.2, 2.9, 1.6, 1.3, "ZeroTier\n(existing)", fill="#F2F2F2")

    # External systems
    box(ax, 0.2, 0.5, 2.3, 1.3, "Proxmox VE\nclusters / nodes", fill="#FAFAFA")
    box(ax, 2.7, 0.5, 2.3, 1.3, "Proxmox\nDatacenter Manager\n(self-hosted)", fill="#FAFAFA")
    box(ax, 5.2, 0.5, 2.3, 1.3, "MeshCentral server\n(self-hosted) + agents", fill="#FAFAFA")
    box(ax, 7.7, 0.5, 2.3, 1.3, "NetFlow exporters\n+ edge collectors", fill="#FAFAFA")
    box(ax, 10.2, 0.5, 1.6, 1.3, "ZeroTier\nnetwork", fill="#FAFAFA")

    # Connections
    arrow(ax, 2.0, 9.0, 2.0, 8.3)
    arrow(ax, 10.0, 9.0, 10.0, 8.3)
    arrow(ax, 3.5, 7.3, 5.0, 6.3, label="HTTPS + Bearer")
    arrow(ax, 8.5, 7.3, 7.0, 6.3, label="HTTPS + Bearer")
    # Backend → providers
    for cx in (1.35, 3.85, 6.35, 8.85, 11.0):
        arrow(ax, 6.0, 5.0, cx, 4.2, color="#B0B0B0")
    # Providers → externals
    for cx in (1.35, 3.85, 6.35, 8.85, 11.0):
        arrow(ax, cx, 2.9, cx, 1.8, color="#B0B0B0")

    ax.text(0.2, 10.3, "Figure 1. System architecture with planned additions (green).",
            fontsize=10, fontstyle="italic", color=MUTED)

    clean(ax, (0, 12), (0, 10.7))
    return save(fig, "01_system_overview.png")


# ------------------------------------------------------------
# 2. PDM architecture
# ------------------------------------------------------------

def pdm_architecture():
    fig, ax = plt.subplots(figsize=(12, 7))

    # Frontends
    box(ax, 0.3, 5.6, 3.3, 1.0, "MDC-web-dashboard\nObservability panel\n(per-VM, workspace-scoped)", bold=True)
    box(ax, 8.4, 5.6, 3.3, 1.0, "MDC-admin-frontend\nObservability section\n(fleet / cluster / node)", bold=True)

    # Backend pipeline
    box(ax, 3.9, 5.6, 4.2, 1.0, "ObservabilityController\nUser-tier  ·  Admin-tier", bold=True, fill="#DCE7F2")

    box(ax, 0.3, 3.7, 2.4, 1.1, "PdmClient\n(typed REST\nwrapper)", fill="#E8F5E9", edge=OK)
    box(ax, 2.9, 3.7, 2.4, 1.1, "PdmTelemetry\nCache\n(single-flight)", fill="#E8F5E9", edge=OK)
    box(ax, 5.5, 3.7, 2.6, 1.1, "PdmResource\nResolver\n(MDC↔PDM ids)", fill="#E8F5E9", edge=OK)
    box(ax, 8.3, 3.7, 3.3, 1.1, "PdmReconciliation\nService (background)", fill="#E8F5E9", edge=OK)

    # PDM + clusters
    box(ax, 3.0, 1.8, 6.0, 1.1, "Proxmox Datacenter Manager (self-hosted)\nREST API  ·  API token auth", fill="#FAFAFA")
    box(ax, 0.3, 0.1, 2.5, 1.2, "Proxmox cluster A", fill="#FAFAFA")
    box(ax, 4.7, 0.1, 2.5, 1.2, "Proxmox cluster B", fill="#FAFAFA")
    box(ax, 9.1, 0.1, 2.5, 1.2, "Proxmox cluster N", fill="#FAFAFA")

    # Arrows
    arrow(ax, 2.0, 5.6, 5.0, 6.6, label="tier-aware\nqueries")
    arrow(ax, 10.0, 5.6, 7.0, 6.6)
    arrow(ax, 6.0, 5.6, 4.0, 4.8, label="calls", color=MUTED)
    arrow(ax, 6.0, 5.6, 6.8, 4.8, color=MUTED)
    arrow(ax, 1.5, 3.7, 6.0, 2.9, label="HTTPS + API token")
    arrow(ax, 6.0, 1.8, 1.5, 1.3, color="#B0B0B0")
    arrow(ax, 6.0, 1.8, 6.0, 1.3, color="#B0B0B0")
    arrow(ax, 6.0, 1.8, 10.5, 1.3, color="#B0B0B0")

    ax.text(0.3, 7.2, "Figure 2. PDM integration — MDC backend is a read-through cache over PDM.",
            fontsize=10, fontstyle="italic", color=MUTED)

    clean(ax, (0, 12), (0, 7.5))
    return save(fig, "02_pdm_architecture.png")


# ------------------------------------------------------------
# 3. MeshCentral architecture + session sequence
# ------------------------------------------------------------

def meshcentral_architecture():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6.5), gridspec_kw={"width_ratios": [1.1, 1]})

    # Panel A — architecture
    title(ax1, "A. Deployment topology")
    box(ax1, 0.3, 5.0, 2.8, 1.0, "User browser")
    box(ax1, 3.6, 5.0, 3.0, 1.0, "MDC Web Dashboard\n(Remote Connect button\n+ VNC option)", bold=True)
    box(ax1, 3.6, 3.2, 3.0, 1.1, "MicroDataCenter-WebAPI\nMeshCentralController\n(trust broker)", bold=True, fill="#DCE7F2")
    box(ax1, 7.2, 3.2, 2.8, 1.1, "MeshCentralClient\n(control WS)", fill="#E8F5E9", edge=OK)
    box(ax1, 3.6, 1.3, 3.0, 1.2, "MeshCentral server\n(self-hosted)", fill="#FAFAFA")
    box(ax1, 7.2, 1.3, 2.8, 1.2, "MeshCentral agent\non target VM", fill="#FAFAFA")
    box(ax1, 0.3, 1.3, 2.8, 1.2, "Existing VNC relay\n(unchanged, coexists)", fill="#F2F2F2")

    arrow(ax1, 3.1, 5.5, 3.6, 5.5, label="HTTPS")
    arrow(ax1, 5.1, 5.0, 5.1, 4.3, label="Bearer")
    arrow(ax1, 6.6, 3.7, 7.2, 3.7, label="ctrl")
    arrow(ax1, 8.6, 3.2, 5.1, 2.5, label="signed URL")
    arrow(ax1, 1.7, 5.0, 1.7, 2.5, label="Console (VNC)\nfallback", ls="--")
    arrow(ax1, 5.1, 1.3, 7.2, 1.9, label="browser WS")
    arrow(ax1, 8.6, 2.5, 8.6, 1.3, label="agent WS")

    clean(ax1, (0, 10.5), (0, 6.5))

    # Panel B — sequence
    title(ax2, "B. Session mint and connect sequence")
    lanes = [("Browser", 0.8), ("MDC Web", 2.6), ("MDC Backend", 4.8), ("MeshCentral", 7.5), ("VM Agent", 9.6)]
    for name, x in lanes:
        ax2.plot([x, x], [0.5, 7.5], color="#AAA", linewidth=1, linestyle="--")
        ax2.text(x, 7.7, name, ha="center", fontsize=9, fontweight="bold")

    def msg(y, xa, xb, label):
        arrow(ax2, xa, y, xb, y, label=label, color="#333", fontsize=8, label_offset=(0, 0.15))

    msg(7.0, 0.8, 2.6, "Click Remote Connect")
    msg(6.3, 2.6, 4.8, "POST /mesh/vms/{id}/session")
    msg(5.6, 4.8, 4.8, "AuthZ check (workspace)")
    msg(4.9, 4.8, 7.5, "POST /control  mintLogin(nodeId)")
    msg(4.2, 7.5, 4.8, "short-lived URL")
    msg(3.5, 4.8, 0.8, "200 {url}")
    msg(2.8, 0.8, 7.5, "GET {url}")
    msg(2.1, 7.5, 9.6, "open WS session")
    msg(1.4, 9.6, 0.8, "desktop/terminal frames")

    clean(ax2, (0, 10.8), (0, 8.2))

    fig.text(0.02, 0.02, "Figure 3. MeshCentral topology and session flow.",
             fontsize=10, fontstyle="italic", color=MUTED)

    fig.tight_layout()
    return save(fig, "03_meshcentral.png")


# ------------------------------------------------------------
# 4. NetFlow tiered distributed architecture
# ------------------------------------------------------------

def netflow_architecture():
    fig, ax = plt.subplots(figsize=(13, 8))

    # Frontends
    box(ax, 0.3, 9.8, 3.6, 0.9, "MDC-web-dashboard\nNetwork tab (per workspace)", bold=True)
    box(ax, 9.1, 9.8, 3.6, 0.9, "MDC-admin-frontend\nNetFlow section", bold=True)

    # API
    box(ax, 4.5, 9.8, 4.0, 0.9, "FlowsController (OData)\ntier rewrites query", bold=True, fill="#DCE7F2")

    # Coordinator
    box(ax, 4.5, 7.8, 4.0, 1.2, "FlowQueryCoordinator\nfan-out + merge + defensive filter", bold=True, fill="#E8F5E9", edge=OK)

    # Central pipeline
    box(ax, 0.3, 5.4, 3.6, 1.8,
        "Central collector (in-process)\nNetFlowListenerService\nv5 / v9 / IPFIX parsers\nFlowEnrichmentService\nFlowRecordSink → EF Core",
        fill="#E8F5E9", edge=OK, fontsize=8)

    # Edge collectors
    box(ax, 4.7, 5.4, 3.6, 1.8,
        "Edge collector #1\nListener + parsers\nEnrichment\nLocal SQLite store\nEdgeCollectorQueryApi",
        fill="#E8F5E9", edge=OK, fontsize=8)
    box(ax, 9.1, 5.4, 3.6, 1.8,
        "Edge collector #N\nListener + parsers\nEnrichment\nLocal SQLite store\nEdgeCollectorQueryApi",
        fill="#E8F5E9", edge=OK, fontsize=8)

    # Exporters
    box(ax, 0.3, 2.9, 3.6, 1.6,
        "Exporters (central reach)\nvSwitch / bridge / ZT\non host(s)", fill="#FAFAFA")
    box(ax, 4.7, 2.9, 3.6, 1.6,
        "Exporters (Site #1)\nToR switch, firewall,\nvirtual bridges", fill="#FAFAFA")
    box(ax, 9.1, 2.9, 3.6, 1.6,
        "Exporters (Site #N)\nToR switch, firewall,\nvirtual bridges", fill="#FAFAFA")

    # Legend
    box(ax, 0.3, 0.7, 12.4, 1.5,
        "Tier enforcement:\n"
        "  • User-tier: FlowsController injects WorkspaceId IN (memberships) AND isPhysical=false.\n"
        "  • Admin-tier: no workspace filter; physical-interface records included.\n"
        "Federation: FlowQueryCoordinator picks collectors by workspace→site map; unions results; applies tier filter defensively.",
        fill="#FFFDF5", edge=WARN, fontsize=9)

    # Arrows
    arrow(ax, 2.0, 9.8, 6.5, 9.3)
    arrow(ax, 10.9, 9.8, 6.5, 9.3)
    arrow(ax, 6.5, 9.8, 6.5, 9.0, label="tier-aware query")
    arrow(ax, 6.5, 7.8, 2.0, 7.2, color="#B0B0B0", label="local call")
    arrow(ax, 6.5, 7.8, 6.5, 7.2, color="#B0B0B0", label="HTTPS + mTLS")
    arrow(ax, 6.5, 7.8, 10.9, 7.2, color="#B0B0B0")
    for sx, tx in [(2.0, 2.0), (6.5, 6.5), (10.9, 10.9)]:
        arrow(ax, sx, 4.5, tx, 5.4, label="UDP v5/v9/IPFIX", color=MUTED)

    ax.text(0.3, 11.0, "Figure 4. NetFlow tiered, distributed collection with central federation.",
            fontsize=10, fontstyle="italic", color=MUTED)

    clean(ax, (0, 13), (0, 11.3))
    return save(fig, "04_netflow_architecture.png")


# ------------------------------------------------------------
# 5. Phase dependency graph
# ------------------------------------------------------------

def phase_dependencies():
    fig, ax = plt.subplots(figsize=(13, 6))

    phases = {
        "P1\nPDM stand-up +\nbackend thin slice": (0.5, 4.5),
        "P2\nUser Observability\npanel": (3.0, 5.5),
        "P3\nAdmin Observability\nsection": (3.0, 3.5),
        "P4\nMeshCentral\nthin slice": (0.5, 1.8),
        "P5\nUser Remote\nConnect UI": (3.0, 1.8),
        "P6\nNetFlow central\ncollector + API": (5.8, 4.5),
        "P7\nUser NetFlow UI": (8.3, 5.5),
        "P8\nAdmin NetFlow UI": (8.3, 3.5),
        "P9\nEdge collector +\nfederation": (10.8, 4.5),
        "P10\nAdmin MeshCentral UI": (8.3, 1.8),
        "P11\nHardening &\nhandover": (11.2, 1.8),
    }
    w, h = 2.0, 1.2
    colors = {
        "P1": "#E8F5E9", "P2": "#E8F5E9", "P3": "#E8F5E9",
        "P4": "#FFF5E0", "P5": "#FFF5E0", "P10": "#FFF5E0",
        "P6": "#E8F1FA", "P7": "#E8F1FA", "P8": "#E8F1FA", "P9": "#E8F1FA",
        "P11": "#F5F5F5",
    }
    edges = {
        "P1": OK, "P2": OK, "P3": OK,
        "P4": WARN, "P5": WARN, "P10": WARN,
        "P6": EDGE, "P7": EDGE, "P8": EDGE, "P9": EDGE,
        "P11": MUTED,
    }
    coords = {}
    for label, (x, y) in phases.items():
        key = label.split("\n", 1)[0]
        box(ax, x, y, w, h, label, fill=colors[key], edge=edges[key], fontsize=8, bold=True)
        coords[key] = (x + w / 2, y + h / 2, x, y, w, h)

    def connect(a, b):
        ax1, ay1, bx1, by1, bw, bh = coords[a]
        cx1, cy1, _, _, _, _ = coords[b]
        # exit right of a, enter left of b
        sx = bx1 + w
        sy = ay1
        ex = coords[b][2]
        ey = coords[b][1]
        arrow(ax, sx, sy, ex, ey, color="#888")

    connect("P1", "P2")
    connect("P1", "P3")
    connect("P4", "P5")
    connect("P1", "P6")
    connect("P6", "P7")
    connect("P6", "P8")
    connect("P8", "P9")
    connect("P5", "P10")
    connect("P9", "P11")
    connect("P10", "P11")
    connect("P7", "P11")

    # Legend
    legend_items = [
        ("Observability (PDM)", "#E8F5E9", OK),
        ("MeshCentral", "#FFF5E0", WARN),
        ("NetFlow", "#E8F1FA", EDGE),
        ("Cross-cutting", "#F5F5F5", MUTED),
    ]
    for i, (lbl, fc, ec) in enumerate(legend_items):
        box(ax, 0.5 + i * 2.8, 0.1, 2.4, 0.5, lbl, fill=fc, edge=ec, fontsize=8)

    ax.text(0.5, 7.2, "Figure 5. Phase dependency graph (arrows = prerequisite).",
            fontsize=10, fontstyle="italic", color=MUTED)

    clean(ax, (0, 14), (0, 7.5))
    return save(fig, "05_phase_dependencies.png")


if __name__ == "__main__":
    system_overview()
    pdm_architecture()
    meshcentral_architecture()
    netflow_architecture()
    phase_dependencies()
    print("Done.")
