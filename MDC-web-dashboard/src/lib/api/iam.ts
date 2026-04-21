// IAM API Client
// Handles roles, permissions, and service accounts

const API_BASE_URL = process.env.API_URL || 'https://microdatacluster.com';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

// Role Types
export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  organizationId?: string;
  permissions: Permission[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
}

export interface UpdateRolePermissionsRequest {
  permissionIds: string[];
}

// Permission Types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface PermissionGroup {
  resource: string;
  displayName: string;
  permissions: Permission[];
}

// Service Account Types
export interface ServiceAccount {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  roleId?: string;
  roleName?: string;
  status: 'active' | 'inactive';
  keyPrefix?: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAccountWithKey extends ServiceAccount {
  apiKey: string;
}

export interface CreateServiceAccountRequest {
  name: string;
  description?: string;
  roleId?: string;
  expiresAt?: string;
}

export interface UpdateServiceAccountRequest {
  name?: string;
  description?: string;
  roleId?: string;
}

// User Brief Type
export interface UserBrief {
  id: string;
  email: string;
  name: string;
}

// IAM Client Class
export class IAMClient {
  private baseUrl: string;
  private getAccessToken: () => string | null;

  constructor(getAccessToken: () => string | null, baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE_URL;
    this.getAccessToken = getAccessToken;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    const headers = this.getHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new IAMError(
        errorData.message || `Request failed: ${response.status}`,
        response.status,
        errorData
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ==================== Roles ====================

  async listRoles(): Promise<Role[]> {
    return this.request<Role[]>('/roles');
  }

  async getRole(id: string): Promise<Role> {
    return this.request<Role>(`/roles/${id}`);
  }

  async createRole(data: CreateRoleRequest): Promise<Role> {
    return this.request<Role>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRole(id: string, data: UpdateRoleRequest): Promise<Role> {
    return this.request<Role>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRole(id: string): Promise<void> {
    await this.request<void>(`/roles/${id}`, {
      method: 'DELETE',
    });
  }

  async getRoleMembers(id: string): Promise<UserBrief[]> {
    return this.request<UserBrief[]>(`/roles/${id}/members`);
  }

  async updateRolePermissions(id: string, permissionIds: string[]): Promise<Role> {
    return this.request<Role>(`/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds }),
    });
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await this.request<void>(`/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    });
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.request<void>(`/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    return this.request<Role[]>(`/users/${userId}/roles`);
  }

  // ==================== Permissions ====================

  async listPermissions(): Promise<Permission[]> {
    return this.request<Permission[]>('/permissions');
  }

  async listPermissionsGrouped(): Promise<PermissionGroup[]> {
    return this.request<PermissionGroup[]>('/permissions/grouped');
  }

  async getPermission(id: string): Promise<Permission> {
    return this.request<Permission>(`/permissions/${id}`);
  }

  async getCurrentUserPermissions(): Promise<{ permissions: string[] }> {
    return this.request<{ permissions: string[] }>('/auth/permissions');
  }

  // ==================== Service Accounts ====================

  async listServiceAccounts(): Promise<ServiceAccount[]> {
    return this.request<ServiceAccount[]>('/service-accounts');
  }

  async getServiceAccount(id: string): Promise<ServiceAccount> {
    return this.request<ServiceAccount>(`/service-accounts/${id}`);
  }

  async createServiceAccount(data: CreateServiceAccountRequest): Promise<ServiceAccountWithKey> {
    return this.request<ServiceAccountWithKey>('/service-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateServiceAccount(id: string, data: UpdateServiceAccountRequest): Promise<ServiceAccount> {
    return this.request<ServiceAccount>(`/service-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteServiceAccount(id: string): Promise<void> {
    await this.request<void>(`/service-accounts/${id}`, {
      method: 'DELETE',
    });
  }

  async rotateServiceAccountKey(id: string): Promise<ServiceAccountWithKey> {
    return this.request<ServiceAccountWithKey>(`/service-accounts/${id}/rotate-key`, {
      method: 'POST',
    });
  }

  async activateServiceAccount(id: string): Promise<void> {
    await this.request<void>(`/service-accounts/${id}/activate`, {
      method: 'POST',
    });
  }

  async deactivateServiceAccount(id: string): Promise<void> {
    await this.request<void>(`/service-accounts/${id}/deactivate`, {
      method: 'POST',
    });
  }
}

// Custom error class for IAM API errors
export class IAMError extends Error {
  public statusCode: number;
  public details: ApiError;

  constructor(message: string, statusCode: number, details: ApiError = { code: '', message: '' }) {
    super(message);
    this.name = 'IAMError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Helper to create client with token getter
export function createIAMClient(getAccessToken: () => string | null): IAMClient {
  return new IAMClient(getAccessToken);
}
