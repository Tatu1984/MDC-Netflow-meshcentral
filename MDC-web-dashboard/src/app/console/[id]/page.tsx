"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Monitor,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clipboard,
  Power,
  Server,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/lib/mdc/hooks";
import { getMsalInstance, mdcApiRequest } from "@/lib/msal-config";
import { getEnv } from "@/lib/env";

type ConsoleTarget = "bastion" | number;

async function getWsUrl(
  workspaceId: string,
  target: ConsoleTarget,
  authParam: string
): Promise<string> {
  const env = await getEnv();
  const base = (env.mdcApiUrl || "https://microdatacluster.com").replace(/^http/, "ws");
  const path =
    target === "bastion"
      ? `${base}/api/vnc/Workspaces(${workspaceId})/BastionConsole`
      : `${base}/api/vnc/Workspaces(${workspaceId})/VirtualMachineConsole(${target})`;
  return `${path}?${authParam}`;
}

async function getAuthParam(): Promise<string> {
  const env = await getEnv();

  // Try MSAL Bearer token first (primary auth)
  const msalInstance = await getMsalInstance();
  if (msalInstance) {
    try {
      await msalInstance.initialize();
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const response = await msalInstance.acquireTokenSilent({
          ...mdcApiRequest,
          account: accounts[0],
        });
        if (response.accessToken) {
          try {
            const payload = JSON.parse(atob(response.accessToken.split(".")[1]));
            if (payload.aud === "00000003-0000-0000-c000-000000000000") {
              console.warn(
                "MSAL returned a Graph token instead of MDC API token. " +
                "Check MDC_SCOPE and app registration API permissions."
              );
            } else {
              return `token=${encodeURIComponent(response.accessToken)}`;
            }
          } catch {
            // If we can't decode, use it anyway
            return `token=${encodeURIComponent(response.accessToken)}`;
          }
        }
      }
    } catch {
      // Fall through to API key
    }
  }

  // Fall back to dev API key
  if (env.mdcDevApiKey) {
    return `apikey=${encodeURIComponent(env.mdcDevApiKey)}`;
  }

  return "";
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export default function StandaloneConsolePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const workspaceId = params.id as string;

  const vmParam = searchParams.get("vm");
  const initialTarget: ConsoleTarget =
    vmParam !== null && vmParam !== "bastion" ? parseInt(vmParam, 10) : "bastion";

  const { data: workspace, isLoading: wsLoading } = useWorkspace(workspaceId);

  const screenRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);

  const [target, setTarget] = useState<ConsoleTarget>(initialTarget);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [noVNCLoaded, setNoVNCLoaded] = useState(false);

  // Cache auth token to avoid re-acquiring on every connect
  const cachedAuthRef = useRef<{ param: string; expiresAt: number } | null>(null);

  const vmList = workspace?.virtualMachines || [];
  const hasBastion = !!workspace?.bastion;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).__noVNC_RFB) {
      setNoVNCLoaded(true);
      return;
    }

    // Load from local /public/novnc — avoids CDN round-trip latency on each page load
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      import RFB from "/novnc/rfb.js";
      window.__noVNC_RFB = RFB;
      window.dispatchEvent(new Event("novnc-loaded"));
    `;
    document.head.appendChild(script);

    const onLoaded = () => setNoVNCLoaded(true);
    window.addEventListener("novnc-loaded", onLoaded);

    return () => {
      window.removeEventListener("novnc-loaded", onLoaded);
    };
  }, []);

  const getCachedAuthParam = useCallback(async (): Promise<string> => {
    const now = Date.now();
    // Reuse cached token if it has more than 60s left
    if (cachedAuthRef.current && cachedAuthRef.current.expiresAt - now > 60_000) {
      return cachedAuthRef.current.param;
    }
    const param = await getAuthParam();
    if (param) {
      // Cache for 5 minutes (MSAL tokens are valid for ~1h)
      cachedAuthRef.current = { param, expiresAt: now + 5 * 60_000 };
    }
    return param;
  }, []);

  const connect = useCallback(async () => {
    if (!screenRef.current || !noVNCLoaded) return;

    const RFB = (window as any).__noVNC_RFB;
    if (!RFB) {
      setErrorMsg("noVNC library failed to load");
      setStatus("error");
      return;
    }

    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch {
        // ignore
      }
      rfbRef.current = null;
    }

    screenRef.current.innerHTML = "";

    setStatus("connecting");
    setErrorMsg("");

    try {
      const authParam = await getCachedAuthParam();
      if (!authParam) {
        setErrorMsg(
          "No authentication available. Sign in or configure a dev API key."
        );
        setStatus("error");
        return;
      }

      const wsUrl = await getWsUrl(workspaceId, target, authParam);

      const rfb = new RFB(screenRef.current, wsUrl);
      rfbRef.current = rfb;

      // Use CSS scaling via scaleViewport — avoids per-frame JS canvas rescaling
      rfb.scaleViewport = true;
      rfb.resizeSession = false; // Disable — sends resize on every window change, adds RTT
      rfb.clipViewport = false;

      // Lower JPEG quality slightly for faster frame delivery over high-latency links.
      // Range 0–9: 0 = best quality/slowest, 9 = lowest quality/fastest. 6 is a good balance.
      rfb.qualityLevel = 6;

      // Compression level for Tight/ZRLE encoding. Range 0–9.
      // Higher = more CPU on server but less data over wire. 2 is low-overhead default.
      rfb.compressionLevel = 2;

      rfb.addEventListener("connect", () => {
        setStatus("connected");
      });

      rfb.addEventListener("disconnect", (e: any) => {
        rfbRef.current = null;
        if (e.detail?.clean === false) {
          setErrorMsg("Connection lost unexpectedly");
          setStatus("error");
        } else {
          setStatus("disconnected");
        }
      });

      rfb.addEventListener("credentialsrequired", () => {
        setErrorMsg(
          "VNC credentials required (unexpected with Proxmox tickets)"
        );
        setStatus("error");
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to connect to console"
      );
      setStatus("error");
    }
  }, [workspaceId, target, noVNCLoaded, getCachedAuthParam]);

  useEffect(() => {
    if (noVNCLoaded && workspaceId) {
      connect();
    }

    return () => {
      if (rfbRef.current) {
        try {
          rfbRef.current.disconnect();
        } catch {
          // ignore
        }
        rfbRef.current = null;
      }
    };
  }, [noVNCLoaded, workspaceId, connect]);

  // Debounced resize: noVNC redraws the canvas on every ResizeObserver tick.
  // Without debouncing this fires dozens of times during window drag, each
  // triggering a full canvas repaint. 150ms debounce eliminates the jank.
  useEffect(() => {
    if (!screenRef.current) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (rfbRef.current) {
          try { rfbRef.current.scaleViewport = rfbRef.current.scaleViewport; } catch { /* ignore */ }
        }
      }, 150);
    });
    observer.observe(screenRef.current);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [noVNCLoaded]);

  const handleDisconnect = () => {
    if (rfbRef.current) {
      rfbRef.current.disconnect();
      rfbRef.current = null;
    }
    setStatus("disconnected");
  };

  const handleTargetChange = (value: string) => {
    const newTarget: ConsoleTarget =
      value === "bastion" ? "bastion" : parseInt(value, 10);
    if (rfbRef.current) {
      rfbRef.current.disconnect();
      rfbRef.current = null;
    }
    setTarget(newTarget);
    setStatus("disconnected");
  };

  const handleFullscreen = () => {
    const container = document.getElementById("console-container");
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleClipboard = async () => {
    if (!rfbRef.current) return;
    try {
      const text = await navigator.clipboard.readText();
      rfbRef.current.clipboardPasteFrom(text);
      toast({ title: "Clipboard sent", description: "Text pasted to VM" });
    } catch {
      toast({
        title: "Clipboard error",
        description: "Could not read clipboard. Check browser permissions.",
        variant: "destructive",
      });
    }
  };

  const handleCtrlAltDel = () => {
    if (rfbRef.current) {
      rfbRef.current.sendCtrlAltDel();
    }
  };

  const targetLabel =
    target === "bastion"
      ? `Bastion${workspace?.bastion?.name ? ` (${workspace.bastion.name})` : ""}`
      : `VM ${target}${vmList[target as number]?.name ? ` (${vmList[target as number].name})` : ""}`;

  const statusBadge = {
    disconnected: <Badge variant="secondary">Disconnected</Badge>,
    connecting: (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Connecting
      </Badge>
    ),
    connected: (
      <Badge className="bg-green-600 hover:bg-green-600 gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        Connected
      </Badge>
    ),
    error: (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Error
      </Badge>
    ),
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold leading-none text-white">
              {wsLoading
                ? "Loading..."
                : `Console: ${workspace?.name || workspaceId}`}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {targetLabel}
            </p>
          </div>
          {statusBadge[status]}
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-2">
            <Select
              value={target === "bastion" ? "bastion" : String(target)}
              onValueChange={handleTargetChange}
              disabled={status === "connecting"}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bastion">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Bastion
                    {workspace?.bastion?.name
                      ? ` — ${workspace.bastion.name}`
                      : ""}
                  </div>
                </SelectItem>
                {vmList.map((vm, index) => (
                  <SelectItem key={index} value={String(index)}>
                    <div className="flex items-center gap-2">
                      <Server className="h-3 w-3" />
                      VM {index}
                      {vm.name ? ` — ${vm.name}` : ""}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {status === "connected" && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClipboard}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Paste clipboard to VM</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCtrlAltDel}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send Ctrl+Alt+Del</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleFullscreen}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  </TooltipContent>
                </Tooltip>
              </>
            )}

            {status === "connected" || status === "connecting" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={connect}
                disabled={!noVNCLoaded}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {status === "error" ? "Retry" : "Connect"}
              </Button>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Console area */}
      <div id="console-container" className="flex-1 bg-black relative">
        {(status === "connecting" ||
          (!noVNCLoaded && status !== "error")) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
              <p className="text-white/70 mt-3 text-sm">
                {!noVNCLoaded
                  ? "Loading VNC client..."
                  : `Connecting to ${targetLabel}...`}
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center max-w-md">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
              <p className="text-white mt-3 font-medium">Connection Failed</p>
              <p className="text-white/60 mt-1 text-sm">{errorMsg}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={connect}
                disabled={!noVNCLoaded}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          </div>
        )}

        {status === "disconnected" && noVNCLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <Monitor className="h-10 w-10 text-white/40 mx-auto" />
              <p className="text-white/60 mt-3 text-sm">
                Console disconnected
              </p>
              <Button variant="outline" className="mt-4" onClick={connect}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            </div>
          </div>
        )}

        <div
          ref={screenRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
