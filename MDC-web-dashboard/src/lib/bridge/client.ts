/**
 * ZT Bridge API Client
 * Client for interacting with the ZT Bridge services
 */

import {
  CreateConsoleRequest,
  ConsoleResponse,
  ConsoleListResponse,
  BridgeHealthResponse,
  PVEProxyInfo,
} from './types';
import { getEnv } from '@/lib/env';

async function getBridgeUrl(): Promise<string> {
  const env = await getEnv();
  return env.bridgeApiUrl || 'https://microdatacluster.com';
}

class BridgeAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'BridgeAPIError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new BridgeAPIError(
      errorText || `Request failed with status ${response.status}`,
      response.status
    );
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Bridge API client for VM console and proxy management
 */
export const bridgeClient = {
  /**
   * Create a new VM console connection
   */
  async createConsole(request: CreateConsoleRequest): Promise<ConsoleResponse> {
    const BRIDGE_API_URL = await getBridgeUrl();
    const response = await fetch(`${BRIDGE_API_URL}/console`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    return handleResponse<ConsoleResponse>(response);
  },

  /**
   * List all console connections
   */
  async listConsoles(): Promise<ConsoleListResponse> {
    const BRIDGE_API_URL = await getBridgeUrl();
    const response = await fetch(`${BRIDGE_API_URL}/console`, {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse<ConsoleListResponse>(response);
  },

  /**
   * Delete a console connection
   */
  async deleteConsole(connectionId: string): Promise<void> {
    const BRIDGE_API_URL = await getBridgeUrl();
    const response = await fetch(`${BRIDGE_API_URL}/console/${connectionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    await handleResponse<void>(response);
  },

  /**
   * Get bridge health status
   */
  async getHealth(): Promise<BridgeHealthResponse> {
    const BRIDGE_API_URL = await getBridgeUrl();
    const response = await fetch(`${BRIDGE_API_URL}/health`, {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse<BridgeHealthResponse>(response);
  },

  /**
   * Get PVE proxy information for a node
   */
  async getPVEProxyInfo(nodeName: string): Promise<PVEProxyInfo> {
    const BRIDGE_API_URL = await getBridgeUrl();
    const response = await fetch(`${BRIDGE_API_URL}/pve-proxy/${nodeName}`, {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse<PVEProxyInfo>(response);
  },

  /**
   * Open a console in a new window/tab
   */
  openConsole(consoleUrl: string): Window | null {
    return window.open(
      consoleUrl,
      '_blank',
      'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no'
    );
  },

  /**
   * Create and immediately open a VM console
   */
  async openVMConsole(request: CreateConsoleRequest): Promise<Window | null> {
    const console = await this.createConsole(request);
    return this.openConsole(console.console_url);
  },
};

export { BridgeAPIError };
export default bridgeClient;
