// Phase 3 — Admin Observability section.
// This lives outside the normal /admin MSAL-gated layout so a developer can
// run it locally without standing up MSAL. Production wiring should move
// these routes under the authenticated admin layout.

import Link from "next/link";
import { fetchStatus } from "@/lib/api/observability";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

const TABS: { href: string; label: string }[] = [
  { href: "/observability",          label: "Fleet" },
  { href: "/observability/nodes",    label: "Nodes" },
  { href: "/observability/storage",  label: "Storage" },
  { href: "/observability/events",   label: "Events" },
];

export default async function ObservabilityLayout({ children }: { children: React.ReactNode }) {
  let statusOk = true;
  let mode = "unknown";
  let serverTimeUtc = "";
  let errMsg = "";
  try {
    const s = await fetchStatus();
    statusOk = s.reachable;
    mode = s.mode;
    serverTimeUtc = s.serverTimeUtc;
  } catch (e) {
    statusOk = false;
    errMsg = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Observability · Admin</h1>
          <div className="text-xs text-muted-foreground" data-testid="status-chip">
            Mode: <Badge variant="secondary">{mode}</Badge>
            {" "}Reachable: <Badge variant={statusOk ? "default" : "destructive"}>{String(statusOk)}</Badge>
            {serverTimeUtc ? <> {" "}Server: <span className="font-mono">{serverTimeUtc}</span></> : null}
          </div>
        </div>
        <nav className="flex gap-4 text-sm border-b" data-testid="observability-tabs">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="py-2 hover:text-primary hover:underline">
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {!statusOk && (
        <Alert variant="destructive" data-testid="degraded-banner">
          <AlertTitle>Backend unreachable</AlertTitle>
          <AlertDescription>
            <div className="text-xs font-mono">{errMsg}</div>
            <div className="mt-1 text-xs">
              Last-known values may be shown on child pages; freshness timestamps are preserved for
              operators to judge staleness.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {children}
    </div>
  );
}
