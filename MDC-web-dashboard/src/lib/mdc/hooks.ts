'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { getMDCClient, MDCClient, MDCError } from './client';
import {
  Organization,
  Site,
  User,
  Workspace,
  RemoteNetwork,
  WorkspaceDescriptor,
  RemoteNetworkUpdate,
  OrganizationDescriptor,
  UserRegistrationDescriptor,
  UserUpdateDescriptor,
  Template,
  DownloadTemplateDescriptor,
  ActivityLog,
  ActivityLogsParams,
  ActivityLogsPage,
} from './types';
import { useMemo, useCallback } from 'react';
import { getMsalInstance, mdcApiRequest } from '@/lib/msal-config';

// Query keys for cache management
export const mdcQueryKeys = {
  all: ['mdc'] as const,
  organizations: () => [...mdcQueryKeys.all, 'organizations'] as const,
  organization: (id: string) => [...mdcQueryKeys.organizations(), id] as const,
  organizationWithSites: (id: string) => [...mdcQueryKeys.organizations(), id, 'withSites'] as const,
  sites: () => [...mdcQueryKeys.all, 'sites'] as const,
  site: (id: string) => [...mdcQueryKeys.sites(), id] as const,
  downloadableTemplates: (siteId: string) => [...mdcQueryKeys.sites(), siteId, 'downloadableTemplates'] as const,
  users: () => [...mdcQueryKeys.all, 'users'] as const,
  user: (id: string) => [...mdcQueryKeys.users(), id] as const,
  workspaces: () => [...mdcQueryKeys.all, 'workspaces'] as const,
  workspace: (id: string) => [...mdcQueryKeys.workspaces(), id] as const,
  workspaceDescriptor: (id: string) => [...mdcQueryKeys.workspace(id), 'descriptor'] as const,
  remoteNetworks: () => [...mdcQueryKeys.all, 'remoteNetworks'] as const,
  remoteNetwork: (id: string) => [...mdcQueryKeys.remoteNetworks(), id] as const,
  activityLogs: () => [...mdcQueryKeys.all, 'activityLogs'] as const,
};

// Helper to get access token from MSAL
async function getAccessToken(): Promise<string | null> {
  const msalInstance = await getMsalInstance();
  if (!msalInstance) return null;

  try {
    // Ensure MSAL is initialized before attempting to acquire tokens
    await msalInstance.initialize();

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;

    const response = await msalInstance.acquireTokenSilent({
      ...mdcApiRequest,
      account: accounts[0],
    });

    return response.accessToken;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

// Hook to get MDC client with authentication
export function useMDCClient(): MDCClient {
  return useMemo(() => {
    return getMDCClient({
      getAccessToken,
    });
  }, []);
}

// ==================== Organizations Hooks ====================

export function useOrganizations(
  options?: Omit<UseQueryOptions<Organization[], MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.organizations(),
    queryFn: () => client.getOrganizations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useOrganization(
  id: string,
  options?: Omit<UseQueryOptions<Organization, MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.organization(id),
    queryFn: () => client.getOrganization(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useOrganizationWithSites(
  id: string,
  options?: Omit<UseQueryOptions<Organization, MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.organizationWithSites(id),
    queryFn: () => client.getOrganizationWithSites(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ==================== Sites Hooks ====================

export interface SitesQueryParams {
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

// Simple hook — returns Site[] for backward compatibility
export function useSites(
  options?: Omit<UseQueryOptions<Site[], MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.sites(),
    queryFn: async () => {
      const res = await client.getSites();
      return res.value;
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

// Advanced hook — supports OData query params, returns { value, count }
export function useSitesQuery(
  params: SitesQueryParams,
  options?: Omit<UseQueryOptions<{ value: Site[]; count?: number }, MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: [...mdcQueryKeys.sites(), params],
    queryFn: () => client.getSites(params),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useSite(
  id: string,
  options?: Omit<UseQueryOptions<Site, MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.site(id),
    queryFn: () => client.getSite(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
    ...options,
  });
}

export function useAddWorkspaceToSite() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, descriptor }: { siteId: string; descriptor: WorkspaceDescriptor }) =>
      client.addWorkspaceToSite(siteId, descriptor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.workspaces() });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.sites() });
    },
  });
}

export function useCreateWorkspace() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, organizationId, descriptor }: { siteId: string; organizationId: string; descriptor: WorkspaceDescriptor }) =>
      client.createWorkspace(siteId, organizationId, descriptor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.workspaces() });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.sites() });
    },
  });
}

export function useCreateWorkspaceRaw() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => client.createWorkspaceRaw(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.workspaces() });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.sites() });
    },
  });
}

export function useDownloadableTemplates(
  siteId: string,
  options?: Omit<UseQueryOptions<Template[], MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.downloadableTemplates(siteId),
    queryFn: () => client.getDownloadableTemplates(siteId),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useDownloadTemplate() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, descriptor }: { siteId: string; descriptor: DownloadTemplateDescriptor }) =>
      client.downloadTemplate(siteId, descriptor),
    onSuccess: (_, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.site(siteId) });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.sites() });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.downloadableTemplates(siteId) });
    },
  });
}

// ==================== Users Hooks ====================

export function useUsers(
  { includeUnregistered }: { includeUnregistered?: boolean } = {},
  options?: Omit<UseQueryOptions<User[], MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: [...mdcQueryKeys.users(), { includeUnregistered }],
    queryFn: () => client.getUsers(includeUnregistered),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useUser(
  id: string,
  options?: Omit<UseQueryOptions<User, MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.user(id),
    queryFn: () => client.getUser(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useRegisterUser() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (descriptor: UserRegistrationDescriptor) =>
      client.registerUser(descriptor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.users() });
    },
  });
}

export function useUpdateUser() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, descriptor }: { id: string; descriptor: UserUpdateDescriptor }) =>
      client.updateUser(id, descriptor),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.users() });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.user(id) });
    },
  });
}

export function useSetUserRegistration() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isRegistered }: { id: string; isRegistered: boolean }) =>
      client.setUserRegistration(id, isRegistered),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.users() });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.user(id) });
    },
  });
}

export function useDeleteUser() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.users() });
    },
  });
}

// ==================== Workspaces Hooks ====================

export function useWorkspaces(
  options?: Omit<UseQueryOptions<Workspace[], MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.workspaces(),
    queryFn: () => client.getWorkspaces(),
    staleTime: 30 * 1000, // 30 seconds - VMs change more frequently
    ...options,
  });
}

export function useWorkspace(
  id: string,
  options?: Omit<UseQueryOptions<Workspace, MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.workspace(id),
    queryFn: () => client.getWorkspace(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useWorkspaceDescriptor(
  workspaceId: string,
  options?: Omit<UseQueryOptions<WorkspaceDescriptor, MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.workspaceDescriptor(workspaceId),
    queryFn: () => client.getWorkspaceDescriptor(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useUpdateWorkspaceDescriptor() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      delta,
    }: {
      workspaceId: string;
      delta: Partial<WorkspaceDescriptor>;
    }) => client.updateWorkspaceDescriptor(workspaceId, delta),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.workspace(workspaceId) });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.workspaceDescriptor(workspaceId) });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.workspaces() });
    },
  });
}

export function useLockWorkspace() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, locked }: { workspaceId: string; locked: boolean }) =>
      client.lockWorkspace(workspaceId, locked),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.workspace(workspaceId) });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.workspaces() });
    },
  });
}

export function useDeleteWorkspace() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => client.deleteWorkspace(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.workspaces() });
      queryClient.removeQueries({ queryKey: mdcQueryKeys.workspace(workspaceId) });
    },
  });
}

// ==================== Remote Networks Hooks ====================

export function useRemoteNetworks(
  options?: Omit<UseQueryOptions<RemoteNetwork[], MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.remoteNetworks(),
    queryFn: () => client.getRemoteNetworks(),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useRemoteNetwork(
  id: string,
  options?: Omit<UseQueryOptions<RemoteNetwork, MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: mdcQueryKeys.remoteNetwork(id),
    queryFn: () => client.getRemoteNetwork(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useUpdateRemoteNetwork() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: RemoteNetworkUpdate }) =>
      client.updateRemoteNetwork(id, update),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.remoteNetwork(id) });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.remoteNetworks() });
    },
  });
}

// ==================== Organizations Mutations ====================

export function useCreateOrganization() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (descriptor: OrganizationDescriptor) =>
      client.createOrganization(descriptor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.organizations() });
    },
  });
}

export function useUpdateOrganization() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, descriptor }: { id: string; descriptor: Partial<OrganizationDescriptor> }) =>
      client.updateOrganization(id, descriptor),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.organization(id) });
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.organizations() });
    },
  });
}

export function useDeleteOrganization() {
  const client = useMDCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mdcQueryKeys.organizations() });
    },
  });
}

// ==================== Activity Logs Hook ====================

export function useActivityLogs(
  params: ActivityLogsParams,
  options?: Omit<UseQueryOptions<ActivityLogsPage, MDCError>, 'queryKey' | 'queryFn'>
) {
  const client = useMDCClient();

  return useQuery({
    queryKey: [...mdcQueryKeys.activityLogs(), params],
    queryFn: () => client.getActivityLogs(params),
    staleTime: 30 * 1000,
    ...options,
  });
}

// ==================== Auth Test Hook ====================

export function useMDCAuthTest() {
  const client = useMDCClient();

  return useQuery({
    queryKey: [...mdcQueryKeys.all, 'authTest'],
    queryFn: async () => {
      const isAuthenticated = await client.testAuth();
      return { isAuthenticated };
    },
    staleTime: 60 * 1000, // 1 minute
    retry: false,
  });
}

// ==================== Combined Dashboard Data Hook ====================

export interface MDCDashboardData {
  organizations: Organization[];
  sites: Site[];
  workspaces: Workspace[];
  remoteNetworks: RemoteNetwork[];
  totalVMs: number;
  onlineNodes: number;
  totalNodes: number;
  onlineMembers: number;
  totalMembers: number;
}

export function useMDCDashboard() {
  const organizations = useOrganizations();
  const sites = useSites();
  const workspaces = useWorkspaces();
  const remoteNetworks = useRemoteNetworks();

  const isLoading =
    organizations.isLoading ||
    sites.isLoading ||
    workspaces.isLoading ||
    remoteNetworks.isLoading;

  const isError =
    organizations.isError ||
    sites.isError ||
    workspaces.isError ||
    remoteNetworks.isError;

  const error =
    organizations.error || sites.error || workspaces.error || remoteNetworks.error;

  const data = useMemo<MDCDashboardData | undefined>(() => {
    if (isLoading || isError) return undefined;

    const orgs = organizations.data || [];
    const siteList = sites.data || [];
    const workspaceList = workspaces.data || [];
    const networkList = remoteNetworks.data || [];

    // Calculate totals
    const totalVMs = workspaceList.reduce(
      (sum, ws) => sum + (ws.virtualMachines?.length || 0),
      0
    );

    const allNodes = siteList.flatMap((s) => s.siteNodes || s.nodes || []);
    const onlineNodes = allNodes.filter((n) => n.online).length;
    const totalNodes = allNodes.length;

    const allMembers = networkList.flatMap((n) => n.members || []);
    const onlineMembers = allMembers.filter((m) => m.online).length;
    const totalMembers = allMembers.length;

    return {
      organizations: orgs,
      sites: siteList,
      workspaces: workspaceList,
      remoteNetworks: networkList,
      totalVMs,
      onlineNodes,
      totalNodes,
      onlineMembers,
      totalMembers,
    };
  }, [
    isLoading,
    isError,
    organizations.data,
    sites.data,
    workspaces.data,
    remoteNetworks.data,
  ]);

  const refetchAll = useCallback(() => {
    organizations.refetch();
    sites.refetch();
    workspaces.refetch();
    remoteNetworks.refetch();
  }, [organizations, sites, workspaces, remoteNetworks]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetchAll,
  };
}
