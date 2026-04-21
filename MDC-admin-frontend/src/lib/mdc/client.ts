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
  SiteUpdateDescriptor,
  DownloadableTemplate,
  DownloadTemplateDescriptor,
  RemoveNodeDescriptor,
  OrganizationDescriptor,
  OrganizationUpdateDescriptor,
  RemoteNetworkUpdate,
  UserRegistrationDescriptor,
  UserUpdateDescriptor,
} from './types';

import { getMdcApiUrl } from '@/lib/msal-config';

export interface MDCClientConfig {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | null>;
}

export class MDCClient {
  private baseUrl: string;
  private getAccessToken?: () => Promise<string | null>;

  constructor(config: MDCClientConfig = {}) {
    // Use explicitly provided baseUrl if given; otherwise resolve from runtime config.
    // Never fall back to a hardcoded URL — if getMdcApiUrl() throws, the caller
    // (useMDCClient hook) handles the error and surfaces it via React Query.
    this.baseUrl = config.baseUrl !== undefined ? config.baseUrl : getMdcApiUrl();
    this.getAccessToken = config.getAccessToken;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Use MSAL Bearer token for authentication
    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new MDCError(
        'MDC API base URL is not configured. Check that MDC_API_URL is set in your environment.',
        0
      );
    }
    const url = `${this.baseUrl}${endpoint}`;
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

    return response.json();
  }

  // ==================== Organizations ====================

  async getOrganizations(params?: {
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
    count?: boolean;
    expand?: string;
  }): Promise<{ value: Organization[]; count?: number }> {
    const qs = new URLSearchParams();
    if (params?.top !== undefined) qs.set('$top', String(params.top));
    if (params?.skip !== undefined) qs.set('$skip', String(params.skip));
    if (params?.filter) qs.set('$filter', params.filter);
    if (params?.orderby) qs.set('$orderby', params.orderby);
    if (params?.count) qs.set('$count', 'true');
    if (params?.expand) qs.set('$expand', params.expand);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await this.request<ODataResponse<Organization>>(`/odata/Organizations${query}`);
    return { value: response.value, count: response['@odata.count'] };
  }

  async getOrganization(id: string): Promise<Organization> {
    return this.request<Organization>(`/odata/Organizations(${id})?$expand=sites`);
  }

  async createOrganization(descriptor: OrganizationDescriptor): Promise<Organization> {
    return this.request<Organization>('/odata/Organizations', {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async updateOrganization(id: string, descriptor: OrganizationUpdateDescriptor): Promise<void> {
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
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
    count?: boolean;
  }): Promise<{ value: Site[]; count?: number }> {
    const qs = new URLSearchParams();
    if (params?.top !== undefined) qs.set('$top', String(params.top));
    if (params?.skip !== undefined) qs.set('$skip', String(params.skip));
    if (params?.filter) qs.set('$filter', params.filter);
    if (params?.orderby) qs.set('$orderby', params.orderby);
    if (params?.count) qs.set('$count', 'true');
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await this.request<ODataResponse<Site>>(`/odata/Sites${query}`);
    return { value: response.value, count: response['@odata.count'] };
  }

  async getSite(id: string): Promise<Site> {
    return this.request<Site>(`/odata/Sites(${id})`);
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

  async deleteSite(siteId: string): Promise<void> {
    await this.request(`/odata/Sites(${siteId})`, {
      method: 'DELETE',
    });
  }

  async updateSite(siteId: string, descriptor: SiteUpdateDescriptor): Promise<void> {
    await this.request(`/odata/Sites(${siteId})`, {
      method: 'PATCH',
      body: JSON.stringify(descriptor),
    });
  }

  async removeSiteNode(siteId: string, descriptor: RemoveNodeDescriptor): Promise<void> {
    await this.request(`/odata/Sites(${siteId})/RemoveNode`, {
      method: 'POST',
      body: JSON.stringify(descriptor),
    });
  }

  async getDownloadableTemplates(siteId: string): Promise<DownloadableTemplate[]> {
    const response = await this.request<ODataResponse<DownloadableTemplate>>(`/odata/Sites(${siteId})/DownloadableTemplates`);
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
    const response = await this.request<ODataResponse<Workspace>>('/odata/Workspaces');
    return response.value;
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.request<Workspace>(`/odata/Workspaces(${id})`);
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

  async updateWorkspaceDescriptor(
    workspaceId: string,
    delta: Partial<WorkspaceDescriptor>
  ): Promise<WorkspaceDescriptor> {
    return this.request<WorkspaceDescriptor>(`/odata/Workspaces(${workspaceId})/UpdateDescriptor`, {
      method: 'PUT',
      body: JSON.stringify(delta),
    });
  }

  async lockWorkspace(workspaceId: string, locked: boolean): Promise<void> {
    await this.request(`/odata/Workspaces(${workspaceId})/Lock`, {
      method: 'PUT',
      body: JSON.stringify({ locked }),
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.request(`/odata/Workspaces(${workspaceId})`, {
      method: 'DELETE',
    });
  }

  // ==================== Remote Networks ====================

  async getRemoteNetworks(): Promise<RemoteNetwork[]> {
    const response = await this.request<ODataResponse<RemoteNetwork>>('/odata/RemoteNetworks');
    return response.value;
  }

  async getRemoteNetwork(id: string): Promise<RemoteNetwork> {
    return this.request<RemoteNetwork>(`/odata/RemoteNetworks(${id})`);
  }

  async updateRemoteNetwork(id: string, update: RemoteNetworkUpdate): Promise<void> {
    await this.request(`/odata/RemoteNetworks(${id})`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
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

  async testAdminAuth(): Promise<boolean> {
    try {
      await this.request('/api/AuthTest/admin');
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

// Default client instance
let defaultClient: MDCClient | null = null;

export function getMDCClient(config?: MDCClientConfig): MDCClient {
  if (!defaultClient || config) {
    defaultClient = new MDCClient(config);
  }
  return defaultClient;
}

// Helper to create client with MSAL token
export function createMDCClientWithMSAL(
  getAccessToken: () => Promise<string | null>
): MDCClient {
  return new MDCClient({
    getAccessToken,
  });
}
