// MicroDataCluster API Client
// Connects to the MDC WebAPI backend (OData endpoints)

import {
  Organization,
  Site,
  User,
  Workspace,
  RemoteNetwork,
  WorkspaceDescriptor,
  ODataResponse,
  MDCApiError,
  SiteDescriptor,
  Template,
  DownloadTemplateDescriptor,
  OrganizationDescriptor,
  RemoteNetworkUpdate,
  UserRegistrationDescriptor,
  UserUpdateDescriptor,
  ActivityLog,
  ActivityLogsParams,
  ActivityLogsPage,
} from './types';
import { getEnv } from '@/lib/env';

// MDC API URL - call the backend directly from both browser and server.
// The API has valid SSL and proper CORS headers so no proxy is needed.
const MDC_API_URL =
  typeof window !== 'undefined'
    ? '' // resolved at runtime via getEnv() in getHeaders()
    : (process.env.MDC_API_URL || 'https://microdatacluster.com');

export interface MDCClientConfig {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | null>;
}

export class MDCClient {
  private baseUrl: string;
  private getAccessToken?: () => Promise<string | null>;

  constructor(config: MDCClientConfig = {}) {
    this.baseUrl = config.baseUrl || MDC_API_URL;
    this.getAccessToken = config.getAccessToken;
  }

  private async resolveBaseUrl(): Promise<string> {
    if (this.baseUrl) return this.baseUrl;
    // Browser: resolve MDC API URL from runtime config
    const env = await getEnv();
    return env.mdcApiUrl;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json;odata.metadata=minimal;odata.streaming=true',
    };

    // Try MSAL Bearer token first (primary auth method)
    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        return headers;
      }
    }

    // Fall back to dev API key when no MSAL token is available.
    const apiKey = typeof window !== 'undefined'
      ? (await getEnv()).mdcDevApiKey
      : process.env.MDC_DEV_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = await this.resolveBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    const headers = await this.getHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData: MDCApiError = await response.json().catch(() => ({}));
      throw new MDCError(
        errorData.error?.message || `Request failed: ${response.status}`,
        response.status,
        errorData
      );
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    const text = await response.text();
    if (!text || text.trim() === '') return undefined as T;
    return JSON.parse(text) as T;
  }

  // ==================== Organizations ====================

  async getOrganizations(): Promise<Organization[]> {
    const response = await this.request<ODataResponse<Organization>>('/odata/Organizations?$expand=sites,workspaces');
    return response.value;
  }

  async getOrganization(id: string): Promise<Organization> {
    return this.request<Organization>(`/odata/Organizations(${id})?$expand=sites,workspaces`);
  }

  async getOrganizationWithSites(id: string): Promise<Organization> {
    return this.request<Organization>(`/odata/Organizations(${id})?$expand=sites,workspaces`);
  }

  async createOrganization(descriptor: OrganizationDescriptor): Promise<Organization> {
    return this.request<Organization>('/odata/Organizations', {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async updateOrganization(id: string, descriptor: Partial<OrganizationDescriptor>): Promise<void> {
    await this.request(`/odata/Organizations(${id})`, {
      method: 'PATCH',
      body: JSON.stringify(descriptor),
    });
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.request(`/odata/Organizations(${id})`, {
      method: 'DELETE',
    });
  }

  // ==================== Sites ====================

  async getSites(params?: {
    filter?: string;
    orderby?: string;
    top?: number;
    skip?: number;
    count?: boolean;
  }): Promise<{ value: Site[]; count?: number }> {
    const parts: string[] = [];
    if (params?.filter) parts.push(`$filter=${encodeURIComponent(params.filter)}`);
    if (params?.orderby) parts.push(`$orderby=${encodeURIComponent(params.orderby)}`);
    if (params?.top != null) parts.push(`$top=${params.top}`);
    if (params?.skip != null) parts.push(`$skip=${params.skip}`);
    if (params?.count) parts.push(`$count=true`);
    parts.push('$expand=workspaces,organizations');
    const qs = `?${parts.join('&')}`;
    const response = await this.request<ODataResponse<Site>>(`/odata/Sites${qs}`);
    return { value: response.value, count: response['@odata.count'] };
  }

  async getSite(id: string): Promise<Site> {
    return this.request<Site>(`/odata/Sites(${id})?$expand=workspaces,organizations`);
  }

  async getSiteWorkspaces(siteId: string): Promise<Workspace[]> {
    const response = await this.request<ODataResponse<Workspace>>(`/odata/Sites(${siteId})/Workspaces`);
    return response.value;
  }

  async createSite(descriptor: SiteDescriptor): Promise<Site> {
    return this.request<Site>('/odata/Sites', {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async updateSite(siteId: string, delta: Partial<Site>): Promise<void> {
    await this.request(`/odata/Sites(${siteId})`, {
      method: 'PATCH',
      body: JSON.stringify(delta),
    });
  }

  async deleteSite(siteId: string): Promise<void> {
    await this.request(`/odata/Sites(${siteId})`, {
      method: 'DELETE',
    });
  }

  async getDownloadableTemplates(siteId: string): Promise<Template[]> {
    const response = await this.request<ODataResponse<Template>>(`/odata/Sites(${siteId})/DownloadableTemplates`);
    return response.value;
  }

  async downloadTemplate(siteId: string, descriptor: DownloadTemplateDescriptor): Promise<void> {
    await this.request(`/odata/Sites(${siteId})/DownloadTemplate`, {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async addWorkspaceToSite(siteId: string, descriptor: WorkspaceDescriptor): Promise<Workspace> {
    return this.request<Workspace>(`/odata/Sites(${siteId})/Workspaces`, {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  // ==================== Users ====================

  async getUsers(includeUnregistered?: boolean): Promise<User[]> {
    const query = includeUnregistered ? '?getUnregisteredUsers=true' : '';
    const response = await this.request<ODataResponse<User>>(`/odata/Users${query}`);
    return response.value;
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/odata/Users(${id})`);
  }

  async registerUser(descriptor: UserRegistrationDescriptor): Promise<User> {
    return this.request<User>('/odata/Users', {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async updateUser(id: string, descriptor: UserUpdateDescriptor): Promise<void> {
    await this.request(`/odata/Users(${id})`, {
      method: 'PATCH',
      body: JSON.stringify(descriptor),
    });
  }

  async setUserRegistration(id: string, isRegistered: boolean): Promise<void> {
    await this.request(`/odata/Users`, {
      method: 'POST',
      body: JSON.stringify({ id, isRegistered }),
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/odata/Users(${id})`, {
      method: 'DELETE',
    });
  }

  // ==================== Workspaces ====================

  async getWorkspaces(): Promise<Workspace[]> {
    const response = await this.request<ODataResponse<Workspace>>('/odata/Workspaces?$expand=organization,site');
    return response.value;
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.request<Workspace>(`/odata/Workspaces(${id})?$expand=organization,site`);
  }

  async getWorkspaceDescriptor(workspaceId: string): Promise<WorkspaceDescriptor> {
    return this.request<WorkspaceDescriptor>(`/odata/Workspaces(${workspaceId})/Descriptor`);
  }

  async createWorkspace(siteId: string, organizationId: string, descriptor: WorkspaceDescriptor): Promise<Workspace> {
    return this.request<Workspace>('/odata/Workspaces', {
      method: 'POST',
      body: JSON.stringify({ siteId, organizationId, descriptor }),
    });
  }

  async createWorkspaceRaw(body: Record<string, unknown>): Promise<Workspace> {
    return this.request<Workspace>('/odata/Workspaces', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateWorkspaceDescriptor(
    workspaceId: string,
    delta: Partial<WorkspaceDescriptor>
  ): Promise<WorkspaceDescriptor> {
    return this.request<WorkspaceDescriptor>(`/odata/Workspaces(${workspaceId})/WorkspaceDescriptor`, {
      method: 'POST',
      body: JSON.stringify(delta),
    });
  }

  async lockWorkspace(workspaceId: string, locked: boolean): Promise<void> {
    await this.request(`/odata/Workspaces(${workspaceId})/Lock`, {
      method: 'POST',
      body: JSON.stringify({ locked }),
    });
  }

  async runWorkspaceCommand(workspaceId: string, command: Record<string, unknown>): Promise<unknown> {
    return this.request(`/odata/Workspaces(${workspaceId})/Command`, {
      method: 'POST',
      body: JSON.stringify(command),
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.request(`/odata/Workspaces(${workspaceId})`, {
      method: 'DELETE',
    });
  }

  // ==================== Remote Networks ====================

  async getRemoteNetworks(): Promise<RemoteNetwork[]> {
    const response = await this.request<ODataResponse<RemoteNetwork>>('/odata/RemoteNetworks?$expand=*&$count=true');
    return response.value;
  }

  async getRemoteNetwork(id: string): Promise<RemoteNetwork> {
    return this.request<RemoteNetwork>(`/odata/RemoteNetworks(${id})?$expand=*`);
  }

  async updateRemoteNetwork(id: string, update: RemoteNetworkUpdate): Promise<void> {
    await this.request(`/odata/RemoteNetworks(${id})`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  // ==================== Activity Logs ====================

  async getActivityLogs(params: ActivityLogsParams): Promise<ActivityLogsPage> {
    const { page, pageSize, entityName, orderBy } = params;
    const skip = (page - 1) * pageSize;

    const queryParts: string[] = [];
    if (entityName) queryParts.push(`$filter=${entityName}`);
    queryParts.push(`$skip=${skip}`);
    queryParts.push(`$top=${pageSize}`);
    queryParts.push(`$count=true`);
    queryParts.push(`$expand=user`);
    if (orderBy) queryParts.push(`$orderby=${orderBy}`);

    const qs = queryParts.join('&');
    const response = await this.request<ODataResponse<ActivityLog>>(`/odata/ActivityLogs?${qs}`);

    if (!response) {
      return { items: [], total: 0, page, pageSize };
    }

    return {
      items: response.value ?? [],
      total: response['@odata.count'] ?? response.value?.length ?? 0,
      page,
      pageSize,
    };
  }

  // ==================== Auth Test ====================

  async testAuth(): Promise<boolean> {
    try {
      await this.request('/api/AuthTest/authenticated');
      return true;
    } catch {
      return false;
    }
  }
}

// Custom error class for MDC API errors
export class MDCError extends Error {
  public statusCode: number;
  public details: MDCApiError;

  constructor(message: string, statusCode: number, details: MDCApiError = {}) {
    super(message);
    this.name = 'MDCError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function getMDCClient(config?: MDCClientConfig): MDCClient {
  // Always create a new instance when config is provided (e.g. with getAccessToken)
  // to ensure auth is always fresh and not cached without a token getter
  return new MDCClient(config);
}

// Helper to create client with MSAL token
export function createMDCClientWithMSAL(
  getAccessToken: () => Promise<string | null>
): MDCClient {
  return new MDCClient({
    getAccessToken,
  });
}
