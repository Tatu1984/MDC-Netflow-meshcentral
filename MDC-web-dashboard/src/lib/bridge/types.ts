/**
 * ZT Bridge Types
 * Types for interacting with the ZT Bridge VM services
 */

// Console connection protocols
export type ConsoleProtocol = 'vnc' | 'rdp' | 'ssh' | 'spice';

// Request to create a VM console connection
export interface CreateConsoleRequest {
  vm_id: string;
  vm_name: string;
  protocol: ConsoleProtocol;
  hostname: string;  // ZeroTier IP of the VM or Proxmox host
  port: number;
  username?: string;
  password?: string;
  organization?: string;
}

// Response from creating a console connection
export interface ConsoleResponse {
  connection_id: string;
  console_url: string;
  protocol: ConsoleProtocol;
  expires_at?: string;
}

// Guacamole connection
export interface GuacamoleConnection {
  name: string;
  identifier: string;
  parentIdentifier?: string;
  protocol: ConsoleProtocol;
  parameters?: Record<string, string>;
  attributes?: Record<string, unknown>;
}

// List of console connections
export interface ConsoleListResponse {
  connections: GuacamoleConnection[];
  count: number;
}

// Bridge health status
export interface BridgeHealthResponse {
  status: boolean;
  components: {
    guacamole: boolean;
    zerotier?: boolean;
    postgres?: boolean;
    nginx?: boolean;
  };
}

// PVE Proxy information
export interface PVEProxyInfo {
  node: string;
  proxy_url: string;
  api_url: string;
}

// Proxmox node configuration
export interface ProxmoxNode {
  name: string;
  zerotier_ip: string;
  port: number;
  api_user?: string;
  status?: 'online' | 'offline' | 'unknown';
}

// VM for console access
export interface VMForConsole {
  id: string;
  name: string;
  node: string;  // Proxmox node name
  vmid: number;  // Proxmox VMID
  status: 'running' | 'stopped' | 'paused';
  type: 'qemu' | 'lxc';
}
