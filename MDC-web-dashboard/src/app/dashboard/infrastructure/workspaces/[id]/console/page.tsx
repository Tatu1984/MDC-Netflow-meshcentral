"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
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

type ConsoleTarget = "bastion" | number; // "bastion" or VM index (0-based)

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

  // Use API key when available (known to work with MDC API)
  if (env.mdcDevApiKey) {
    return `apikey=${encodeURIComponent(env.mdcDevApiKey)}`;
  }

  // Otherwise try MSAL Bearer token
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
          // Verify the token has the correct audience (not Graph API)
          // Graph tokens (aud 00000003-...) won't work with MDC WebSocket
          try {
            const payload = JSON.parse(atob(response.accessToken.split(".")[1]));
            if (payload.aud === "00000003-0000-0000-c000-000000000000") {
              console.warn(
                "MSAL returned a Graph token instead of MDC API token. " +
                "Check MDC_SCOPE and app registration API permissions."
              );
              return "";
            }
          } catch {
            // If we can't decode, try using it anyway
          }
          return `token=${encodeURIComponent(response.accessToken)}`;
        }
      }
    } catch {
      // No auth available
    }
  }

  return "";
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export default function WorkspaceConsolePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const workspaceId = params.id as string;

  // Read initial target from query string: ?vm=0 or ?vm=bastion (default)
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

  // Build list of connectable targets from workspace data
  const vmList = workspace?.virtualMachines || [];
  const hasBastion = !!workspace?.bastion;

  // Load noVNC from CDN
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).__noVNC_RFB) {
      setNoVNCLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      import RFB from "https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/core/rfb.js";
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

  const connect = useCallback(async () => {
    if (!screenRef.current || !noVNCLoaded) return;

    const RFB = (window as any).__noVNC_RFB;
    if (!RFB) {
      setErrorMsg("noVNC library failed to load");
      setStatus("error");
      return;
    }

    // Disconnect existing connection
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch {
        // ignore
      }
      rfbRef.current = null;
    }

    // Clear previous canvas
    screenRef.current.innerHTML = "";

    setStatus("connecting");
    setErrorMsg("");

    try {
      const authParam = await getAuthParam();
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

      rfb.scaleViewport = true;
      rfb.resizeSession = true;
      rfb.clipViewport = false;

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
  }, [workspaceId, target, noVNCLoaded]);

  // Auto-connect when noVNC is loaded
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
    // Disconnect current session before switching
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

  // Resolve display label for the current target
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="dark flex items-center justify-between border-b border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-100">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-neutral-100 hover:bg-neutral-700 hover:text-white"
            onClick={() =>
              router.push(`/dashboard/infrastructure/workspaces/${workspaceId}`)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Monitor className="h-5 w-5 text-neutral-400" />
          <div>
            <h1 className="text-lg font-semibold leading-none text-neutral-100">
              {wsLoading
                ? "Loading..."
                : `Console: ${workspace?.name || workspaceId}`}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {targetLabel}
            </p>
          </div>
          {statusBadge[status]}
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-2">
            {/* Target selector */}
            <Select
              value={target === "bastion" ? "bastion" : String(target)}
              onValueChange={handleTargetChange}
              disabled={status === "connecting"}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs bg-neutral-800 text-neutral-100 border-neutral-600 hover:bg-neutral-700">
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 text-neutral-100 border-neutral-700 [&_[role=option]:focus]:bg-neutral-700 [&_[role=option]:focus]:text-white [&_[role=option][data-state=checked]]:text-white">
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
                      className="text-neutral-100 hover:bg-neutral-700 hover:text-white"
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
                      className="text-neutral-100 hover:bg-neutral-700 hover:text-white"
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
                      className="text-neutral-100 hover:bg-neutral-700 hover:text-white"
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
                className="border-neutral-600 bg-transparent text-neutral-100 hover:bg-neutral-700 hover:text-white"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={connect}
                disabled={!noVNCLoaded}
                className="gap-1 bg-blue-600 text-white hover:bg-blue-500"
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
        {/* Loading overlay */}
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

        {/* Error overlay */}
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

        {/* Disconnected state */}
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

        {/* noVNC render target */}
        <div
          ref={screenRef}
          className="w-full h-full"
          style={{ minHeight: "calc(100vh - 57px)" }}
        />
      </div>
    </div>
  );
}
