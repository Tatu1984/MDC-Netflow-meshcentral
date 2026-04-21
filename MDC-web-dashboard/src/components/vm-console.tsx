'use client';

import * as React from 'react';
import { Monitor, Terminal, Loader2, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useOpenConsole, ConsoleProtocol } from '@/lib/bridge';

interface VMConsoleProps {
  vmId: string;
  vmName: string;
  vmStatus: 'running' | 'stopped' | 'paused';
  hostname: string;  // ZeroTier IP
  defaultProtocol?: ConsoleProtocol;
  defaultPort?: number;
  organization?: string;
  variant?: 'button' | 'icon';
}

export function VMConsole({
  vmId,
  vmName,
  vmStatus,
  hostname,
  defaultProtocol = 'vnc',
  defaultPort,
  organization,
  variant = 'button',
}: VMConsoleProps) {
  const [open, setOpen] = React.useState(false);
  const [protocol, setProtocol] = React.useState<ConsoleProtocol>(defaultProtocol);
  const [port, setPort] = React.useState<number>(defaultPort || getDefaultPort(defaultProtocol));
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const { openConsole, isLoading, error, reset } = useOpenConsole();
  const { toast } = useToast();

  // Update port when protocol changes
  React.useEffect(() => {
    if (!defaultPort) {
      setPort(getDefaultPort(protocol));
    }
  }, [protocol, defaultPort]);

  function getDefaultPort(proto: ConsoleProtocol): number {
    switch (proto) {
      case 'vnc': return 5900;
      case 'rdp': return 3389;
      case 'ssh': return 22;
      case 'spice': return 5900;
      default: return 5900;
    }
  }

  const handleOpenConsole = async () => {
    try {
      const windowRef = await openConsole({
        vm_id: vmId,
        vm_name: vmName,
        protocol,
        hostname,
        port,
        username: username || undefined,
        password: password || undefined,
        organization,
      });

      if (windowRef) {
        toast({
          title: 'Console opened',
          description: `${vmName} console opened in a new window`,
        });
        setOpen(false);
      } else {
        toast({
          title: 'Popup blocked',
          description: 'Please allow popups for this site to open the console',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Failed to open console',
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const isVMRunning = vmStatus === 'running';
  const needsCredentials = protocol === 'ssh' || protocol === 'rdp';

  const TriggerButton = variant === 'icon' ? (
    <Button
      variant="ghost"
      size="icon"
      disabled={!isVMRunning}
      title={isVMRunning ? 'Open console' : 'VM must be running'}
    >
      <Monitor className="h-4 w-4" />
    </Button>
  ) : (
    <Button
      variant="outline"
      disabled={!isVMRunning}
      className="gap-2"
    >
      <Terminal className="h-4 w-4" />
      Console
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) reset();
    }}>
      <DialogTrigger asChild>
        {TriggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Open Console: {vmName}
          </DialogTitle>
          <DialogDescription>
            Connect to the VM console via the ZT Bridge. Select a protocol and configure connection settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Protocol Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="protocol" className="text-right">
              Protocol
            </Label>
            <Select value={protocol} onValueChange={(v) => setProtocol(v as ConsoleProtocol)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vnc">VNC (Virtual Network Computing)</SelectItem>
                <SelectItem value="spice">SPICE (Proxmox)</SelectItem>
                <SelectItem value="rdp">RDP (Windows Remote Desktop)</SelectItem>
                <SelectItem value="ssh">SSH (Secure Shell)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hostname (read-only) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hostname" className="text-right">
              Host
            </Label>
            <Input
              id="hostname"
              value={hostname}
              disabled
              className="col-span-3 bg-muted"
            />
          </div>

          {/* Port */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="port" className="text-right">
              Port
            </Label>
            <Input
              id="port"
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>

          {/* Credentials (for SSH/RDP) */}
          {needsCredentials && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={protocol === 'ssh' ? 'root' : 'Administrator'}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleOpenConsole} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Open Console
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Embedded console component (iframe)
interface EmbeddedConsoleProps {
  consoleUrl: string;
  onClose?: () => void;
  className?: string;
}

export function EmbeddedConsole({ consoleUrl, onClose, className }: EmbeddedConsoleProps) {
  return (
    <div className={`relative w-full h-full min-h-[600px] bg-black rounded-lg overflow-hidden ${className}`}>
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <iframe
        src={consoleUrl}
        className="w-full h-full border-0"
        allow="clipboard-read; clipboard-write"
        title="VM Console"
      />
    </div>
  );
}
