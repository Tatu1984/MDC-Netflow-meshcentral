/**
 * ZT Bridge React Query Hooks
 * React Query hooks for ZT Bridge operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bridgeClient } from './client';
import {
  CreateConsoleRequest,
  ConsoleResponse,
  ConsoleListResponse,
  BridgeHealthResponse,
  PVEProxyInfo,
} from './types';

// Query keys
export const bridgeKeys = {
  all: ['bridge'] as const,
  consoles: () => [...bridgeKeys.all, 'consoles'] as const,
  health: () => [...bridgeKeys.all, 'health'] as const,
  pveProxy: (node: string) => [...bridgeKeys.all, 'pve-proxy', node] as const,
};

/**
 * Hook to list all console connections
 */
export function useConsoles() {
  return useQuery<ConsoleListResponse, Error>({
    queryKey: bridgeKeys.consoles(),
    queryFn: () => bridgeClient.listConsoles(),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to create a new console connection
 */
export function useCreateConsole() {
  const queryClient = useQueryClient();

  return useMutation<ConsoleResponse, Error, CreateConsoleRequest>({
    mutationFn: (request) => bridgeClient.createConsole(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bridgeKeys.consoles() });
    },
  });
}

/**
 * Hook to delete a console connection
 */
export function useDeleteConsole() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (connectionId) => bridgeClient.deleteConsole(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bridgeKeys.consoles() });
    },
  });
}

/**
 * Hook to get bridge health status
 */
export function useBridgeHealth() {
  return useQuery<BridgeHealthResponse, Error>({
    queryKey: bridgeKeys.health(),
    queryFn: () => bridgeClient.getHealth(),
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Hook to get PVE proxy information
 */
export function usePVEProxyInfo(nodeName: string) {
  return useQuery<PVEProxyInfo, Error>({
    queryKey: bridgeKeys.pveProxy(nodeName),
    queryFn: () => bridgeClient.getPVEProxyInfo(nodeName),
    enabled: !!nodeName,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to open a VM console
 * Creates a connection and opens it in a new window
 */
export function useOpenConsole() {
  const createConsoleMutation = useCreateConsole();

  const openConsole = async (request: CreateConsoleRequest) => {
    const console = await createConsoleMutation.mutateAsync(request);
    return bridgeClient.openConsole(console.console_url);
  };

  return {
    openConsole,
    isLoading: createConsoleMutation.isPending,
    error: createConsoleMutation.error,
    reset: createConsoleMutation.reset,
  };
}
