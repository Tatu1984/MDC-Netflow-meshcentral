'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import {
  IAMClient,
  IAMError,
  Role,
  Permission,
  PermissionGroup,
  ServiceAccount,
  ServiceAccountWithKey,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreateServiceAccountRequest,
  UpdateServiceAccountRequest,
  UserBrief,
  createIAMClient,
} from '@/lib/api/iam';

// Query keys for cache management
export const iamQueryKeys = {
  all: ['iam'] as const,
  roles: () => [...iamQueryKeys.all, 'roles'] as const,
  role: (id: string) => [...iamQueryKeys.roles(), id] as const,
  roleMembers: (id: string) => [...iamQueryKeys.role(id), 'members'] as const,
  permissions: () => [...iamQueryKeys.all, 'permissions'] as const,
  permissionsGrouped: () => [...iamQueryKeys.permissions(), 'grouped'] as const,
  permission: (id: string) => [...iamQueryKeys.permissions(), id] as const,
  serviceAccounts: () => [...iamQueryKeys.all, 'service-accounts'] as const,
  serviceAccount: (id: string) => [...iamQueryKeys.serviceAccounts(), id] as const,
  userRoles: (userId: string) => [...iamQueryKeys.all, 'users', userId, 'roles'] as const,
  userPermissions: () => [...iamQueryKeys.all, 'user-permissions'] as const,
};

// Helper to get access token from localStorage
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) return null;

  try {
    const parsed = JSON.parse(authStorage);
    return parsed?.state?.accessToken || null;
  } catch {
    return null;
  }
}

// Hook to get IAM client
export function useIAMClient(): IAMClient {
  return useMemo(() => {
    return createIAMClient(getAccessToken);
  }, []);
}

// ==================== Roles Hooks ====================

export function useRoles(
  options?: Omit<UseQueryOptions<Role[], IAMError>, 'queryKey' | 'queryFn'>
) {
  const client = useIAMClient();

  return useQuery({
    queryKey: iamQueryKeys.roles(),
    queryFn: () => client.listRoles(),
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

export function useRole(
  id: string,
  options?: Omit<UseQueryOptions<Role, IAMError>, 'queryKey' | 'queryFn'>
) {
  const client = useIAMClient();

  return useQuery({
    queryKey: iamQueryKeys.role(id),
    queryFn: () => client.getRole(id),
    enabled: !!id,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useRoleMembers(
  roleId: string,
  options?: Omit<UseQueryOptions<UserBrief[], IAMError>, 'queryKey' | 'queryFn'>
) {
  const client = useIAMClient();

  return useQuery({
    queryKey: iamQueryKeys.roleMembers(roleId),
    queryFn: () => client.getRoleMembers(roleId),
    enabled: !!roleId,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useCreateRole() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleRequest) => client.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.roles() });
    },
  });
}

export function useUpdateRole() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      client.updateRole(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.role(id) });
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.roles() });
    },
  });
}

export function useDeleteRole() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.roles() });
    },
  });
}

export function useUpdateRolePermissions() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
      client.updateRolePermissions(id, permissionIds),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.role(id) });
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.roles() });
    },
  });
}

export function useAssignRoleToUser() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      client.assignRoleToUser(userId, roleId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.userRoles(userId) });
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.roles() });
    },
  });
}

export function useRemoveRoleFromUser() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      client.removeRoleFromUser(userId, roleId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.userRoles(userId) });
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.roles() });
    },
  });
}

export function useUserRoles(
  userId: string,
  options?: Omit<UseQueryOptions<Role[], IAMError>, 'queryKey' | 'queryFn'>
) {
  const client = useIAMClient();

  return useQuery({
    queryKey: iamQueryKeys.userRoles(userId),
    queryFn: () => client.getUserRoles(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
    ...options,
  });
}

// ==================== Permissions Hooks ====================

export function usePermissions(
  options?: Omit<UseQueryOptions<Permission[], IAMError>, 'queryKey' | 'queryFn'>
) {
  const client = useIAMClient();

  return useQuery({
    queryKey: iamQueryKeys.permissions(),
    queryFn: () => client.listPermissions(),
    staleTime: 5 * 60 * 1000, // 5 minutes - permissions rarely change
    ...options,
  });
}

export function usePermissionsGrouped(
  options?: Omit<UseQueryOptions<PermissionGroup[], IAMError>, 'queryKey' | 'queryFn'>
) {
  const client = useIAMClient();

  return useQuery({
    queryKey: iamQueryKeys.permissionsGrouped(),
    queryFn: () => client.listPermissionsGrouped(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCurrentUserPermissions(
  options?: Omit<UseQueryOptions<{ permissions: string[] }, IAMError>, 'queryKey' | 'queryFn'>
) {
  const client = useIAMClient();

  return useQuery({
    queryKey: iamQueryKeys.userPermissions(),
    queryFn: () => client.getCurrentUserPermissions(),
    staleTime: 60 * 1000,
    ...options,
  });
}

// ==================== Service Accounts Hooks ====================

export function useServiceAccounts(
  options?: Omit<UseQueryOptions<ServiceAccount[], IAMError>, 'queryKey' | 'queryFn'>
) {
  const client = useIAMClient();

  return useQuery({
    queryKey: iamQueryKeys.serviceAccounts(),
    queryFn: () => client.listServiceAccounts(),
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useServiceAccount(
  id: string,
  options?: Omit<UseQueryOptions<ServiceAccount, IAMError>, 'queryKey' | 'queryFn'>
) {
  const client = useIAMClient();

  return useQuery({
    queryKey: iamQueryKeys.serviceAccount(id),
    queryFn: () => client.getServiceAccount(id),
    enabled: !!id,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useCreateServiceAccount() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceAccountRequest) => client.createServiceAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccounts() });
    },
  });
}

export function useUpdateServiceAccount() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceAccountRequest }) =>
      client.updateServiceAccount(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccount(id) });
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccounts() });
    },
  });
}

export function useDeleteServiceAccount() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.deleteServiceAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccounts() });
    },
  });
}

export function useRotateServiceAccountKey() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.rotateServiceAccountKey(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccount(id) });
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccounts() });
    },
  });
}

export function useActivateServiceAccount() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.activateServiceAccount(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccount(id) });
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccounts() });
    },
  });
}

export function useDeactivateServiceAccount() {
  const client = useIAMClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.deactivateServiceAccount(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccount(id) });
      queryClient.invalidateQueries({ queryKey: iamQueryKeys.serviceAccounts() });
    },
  });
}

// ==================== Permission Check Hook ====================

export function useHasPermission(permission: string): boolean {
  const { data } = useCurrentUserPermissions();

  if (!data?.permissions) return false;

  return data.permissions.some(p => {
    if (p === permission) return true;
    // Check for wildcard permissions
    if (p.endsWith(':*')) {
      const resource = p.slice(0, -2);
      return permission.startsWith(resource + ':');
    }
    return false;
  });
}

export function useHasAnyPermission(permissions: string[]): boolean {
  const { data } = useCurrentUserPermissions();

  if (!data?.permissions) return false;

  return permissions.some(permission => {
    return data.permissions.some(p => {
      if (p === permission) return true;
      if (p.endsWith(':*')) {
        const resource = p.slice(0, -2);
        return permission.startsWith(resource + ':');
      }
      return false;
    });
  });
}
