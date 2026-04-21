"use client";

import { useState } from "react";
import type { MeshStatus } from "@/lib/api/mesh";

type Props = { vmid: number; asKey?: string; status: MeshStatus | null };

export function RemoteConnectButton({ vmid, asKey, status }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const disabled = busy || !(status?.enrolled && status.online);
  const reason = !status?.enrolled
    ? "No MeshCentral agent is enrolled on this VM. Use the VNC console instead."
    : !status.online
    ? "The MeshCentral agent is offline. Use the VNC console instead."
    : null;

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ vmid: String(vmid) });
      if (asKey) qs.set("as", asKey);
      const res = await fetch(`/api/mesh/session?${qs.toString()}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.kind ?? `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as { url: string };
      setLastUrl(body.url);
      // In a real UX we'd window.open; for the audit we also render the link so
      // Playwright can verify deterministically without dealing with popups.
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        data-testid="remote-connect-btn"
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Opening session…" : "Remote Connect"}
      </button>
      {reason && (
        <p className="text-xs text-muted-foreground" data-testid="remote-connect-reason">{reason}</p>
      )}
      {error && (
        <p className="text-xs text-destructive" data-testid="remote-connect-error">Error: {error}</p>
      )}
      {lastUrl && (
        <p className="text-xs" data-testid="remote-connect-url-line">
          Session URL:{" "}
          <a className="underline" href={lastUrl} target="_blank" rel="noopener noreferrer" data-testid="remote-connect-url">
            {lastUrl}
          </a>
        </p>
      )}
    </div>
  );
}
