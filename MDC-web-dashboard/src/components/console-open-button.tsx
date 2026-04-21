"use client";

import { useCallback, useRef } from "react";
import { Monitor, ExternalLink, AppWindow } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface ConsoleOpenButtonProps {
  workspaceId: string;
  vm?: string;
  variant: "button" | "dropdown-item";
  size?: "sm" | "default" | "lg" | "icon";
}

function getConsoleUrl(workspaceId: string, vm?: string): string {
  const base = `/console/${workspaceId}`;
  return vm !== undefined ? `${base}?vm=${vm}` : base;
}

function openNewTab(url: string) {
  window.open(url, "_blank");
}

function openPopup(url: string, workspaceId: string) {
  window.open(
    url,
    `vm-console-${workspaceId}`,
    "width=1280,height=800,menubar=no,toolbar=no,location=no,status=no"
  );
}

export function ConsoleOpenButton({
  workspaceId,
  vm,
  variant,
  size = "sm",
}: ConsoleOpenButtonProps) {
  const url = getConsoleUrl(workspaceId, vm);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Wait briefly to see if it's a double-click
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => {
        openNewTab(url);
      }, 250);
    },
    [url]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      openPopup(url, workspaceId);
    },
    [url, workspaceId]
  );

  if (variant === "dropdown-item") {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Monitor className="mr-2 h-4 w-4" />
          Console
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem onSelect={() => openNewTab(url)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            New Tab
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openPopup(url, workspaceId)}>
            <AppWindow className="mr-2 h-4 w-4" />
            Popup Window
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={size}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          >
            <Monitor className="mr-2 h-3 w-3" />
            Console
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Click: New Tab &middot; Double-click: Popup</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
