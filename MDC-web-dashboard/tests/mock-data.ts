/**
 * Mock data for Playwright E2E tests.
 * Used to intercept API responses and seed auth state.
 */

// ── Auth state (matches Zustand auth-storage shape) ──────────────────────────

export const mockUser = {
  id: 'test-user-001',
  name: 'Test User',
  email: 'testuser@example.com',
  role: 'admin',
  organizationId: 'org-001',
};

export const mockOrganization = {
  id: 'org-001',
  name: 'Test Organization',
  slug: 'test-org',
  plan: 'enterprise',
  createdAt: '2025-01-01T00:00:00Z',
};

export const mockAuthState = {
  state: {
    user: mockUser,
    organization: mockOrganization,
    currentProject: null,
    projects: [],
    isAuthenticated: true,
    permissions: ['GlobalAdministrator'],
    accessToken: 'mock-access-token-for-testing',
    _hasHydrated: true,
  },
  version: 0,
};

// ── Organizations ────────────────────────────────────────────────────────────

export const mockOrganizations = [
  {
    id: 'org-001',
    name: 'Test Organization',
    sites: ['site-001'],
    workspaces: ['ws-001'],
    organizationUserRoles: [
      { userId: 'test-user-001', role: 'admin' },
    ],
  },
  {
    id: 'org-002',
    name: 'Secondary Org',
    sites: ['site-002'],
    workspaces: ['ws-002'],
    organizationUserRoles: [],
  },
];

// ── Sites ────────────────────────────────────────────────────────────────────

export const mockSiteNodes = [
  {
    name: 'node-alpha',
    online: true,
    authorized: true,
    configured: true,
    cpuInfo: { model: 'Intel Xeon E5', sockets: 2, coresPerSocket: 8, mhz: 3200, cpus: 16 },
    memoryUsed: 8192,
    memoryTotal: 32768,
    storageUsed: 200,
    storageTotal: 1000,
    diskUsed: 150,
    diskTotal: 500,
    serialNumber: 'SN-001',
    hostname: 'node-alpha.local',
    registeredAt: '2025-06-01T00:00:00Z',
  },
  {
    name: 'node-beta',
    online: false,
    authorized: true,
    configured: true,
    cpuInfo: { model: 'AMD EPYC 7742', sockets: 1, coresPerSocket: 16, mhz: 2800, cpus: 16 },
    memoryUsed: 4096,
    memoryTotal: 16384,
    storageUsed: 100,
    storageTotal: 500,
    diskUsed: 80,
    diskTotal: 250,
    serialNumber: 'SN-002',
    hostname: 'node-beta.local',
    registeredAt: '2025-06-15T00:00:00Z',
  },
];

export const mockSites = [
  {
    id: 'site-001',
    name: 'Primary Site',
    description: 'Main datacenter site',
    siteNodes: mockSiteNodes,
    workspaces: ['ws-001'],
    templates: [],
  },
  {
    id: 'site-002',
    name: 'Secondary Site',
    description: 'DR datacenter site',
    siteNodes: [mockSiteNodes[0]],
    workspaces: [],
    templates: [],
  },
];

// ── Workspaces ───────────────────────────────────────────────────────────────

export const mockWorkspaces = [
  {
    id: 'ws-001',
    name: 'Production Workspace',
    siteId: 'site-001',
    organizationId: 'org-001',
    address: '10.0.0.0/24',
    locked: false,
    bastion: {
      templateName: 'ubuntu-bastion',
      revisionName: 'v1.0',
    },
    virtualMachines: [
      {
        index: 0,
        name: 'web-server-01',
        status: 'Running',
        cores: 4,
        memory: 8192,
        storage: 100,
        networkAdapters: [
          { index: 0, networkIndex: 0, ipAddress: '10.0.0.10' },
        ],
      },
      {
        index: 1,
        name: 'db-server-01',
        status: 'Running',
        cores: 8,
        memory: 16384,
        storage: 500,
        networkAdapters: [
          { index: 0, networkIndex: 0, ipAddress: '10.0.0.11' },
        ],
      },
    ],
    virtualNetworks: [
      {
        id: 'vnet-001',
        index: 0,
        name: 'default-network',
        gatewayStatus: 'active',
        remoteNetworkId: 'rn-001',
      },
    ],
    createdAt: '2025-07-01T00:00:00Z',
  },
  {
    id: 'ws-002',
    name: 'Development Workspace',
    siteId: 'site-001',
    organizationId: 'org-001',
    address: '10.1.0.0/24',
    locked: true,
    bastion: null,
    virtualMachines: [
      {
        index: 0,
        name: 'dev-server-01',
        status: 'Stopped',
        cores: 2,
        memory: 4096,
        storage: 50,
        networkAdapters: [],
      },
    ],
    virtualNetworks: [],
    createdAt: '2025-08-01T00:00:00Z',
  },
];

// ── Remote Networks ──────────────────────────────────────────────────────────

export const mockRemoteNetworks = [
  {
    id: 'rn-001',
    name: 'prod-overlay',
    siteId: 'site-001',
    workspaceId: 'ws-001',
    virtualNetworkId: 'vnet-001',
    ipAssignmentPools: [{ start: '10.100.0.1', end: '10.100.0.254' }],
    managedRoutes: [{ target: '10.0.0.0/24', via: '10.100.0.1' }],
    members: [
      {
        id: 'member-001',
        name: 'gateway-node',
        online: true,
        authorized: true,
        latency: 12,
        ipAddresses: ['10.100.0.1'],
        lastOnline: '2025-10-01T12:00:00Z',
      },
      {
        id: 'member-002',
        name: 'client-node',
        online: false,
        authorized: true,
        latency: -1,
        ipAddresses: ['10.100.0.2'],
        lastOnline: '2025-09-28T08:00:00Z',
      },
    ],
  },
];

// ── Users ────────────────────────────────────────────────────────────────────

export const mockUsers = [
  {
    id: 'test-user-001',
    displayName: 'Test User',
    emailAddress: 'testuser@example.com',
    isRegistered: true,
    appRoles: ['GlobalAdministrator'],
    organizationRoles: [{ organizationId: 'org-001', role: 'admin' }],
  },
  {
    id: 'test-user-002',
    displayName: 'Jane Developer',
    emailAddress: 'jane@example.com',
    isRegistered: true,
    appRoles: ['WorkspaceUser'],
    organizationRoles: [{ organizationId: 'org-001', role: 'developer' }],
  },
  {
    id: 'test-user-003',
    displayName: 'Bob Viewer',
    emailAddress: 'bob@example.com',
    isRegistered: false,
    appRoles: [],
    organizationRoles: [],
  },
];

// ── Activity Logs ────────────────────────────────────────────────────────────

export const mockActivityLogs = [
  {
    id: 'log-001',
    entityName: 'DbWorkspace',
    entityId: 'ws-001',
    action: 'Added',
    userId: 'test-user-001',
    userEmail: 'testuser@example.com',
    timestampUtc: '2025-10-01T10:30:00Z',
    changesJson: JSON.stringify([
      { field: 'Name', oldValue: null, newValue: 'Production Workspace' },
    ]),
  },
  {
    id: 'log-002',
    entityName: 'DbWorkspace',
    entityId: 'ws-001',
    action: 'Modified',
    userId: 'test-user-001',
    userEmail: 'testuser@example.com',
    timestampUtc: '2025-10-02T14:00:00Z',
    changesJson: JSON.stringify([
      { field: 'Locked', oldValue: 'false', newValue: 'true' },
    ]),
  },
  {
    id: 'log-003',
    entityName: 'DbOrganization',
    entityId: 'org-002',
    action: 'Deleted',
    userId: 'test-user-002',
    userEmail: 'jane@example.com',
    timestampUtc: '2025-10-03T09:15:00Z',
    changesJson: JSON.stringify([
      { field: 'Name', oldValue: 'Old Org', newValue: null },
    ]),
  },
];

// ── Templates ────────────────────────────────────────────────────────────────

export const mockTemplates = [
  {
    name: 'ubuntu-bastion',
    type: 'Linux',
    revisionName: 'v1.0',
    cores: 2,
    memory: 4096,
    storage: 20,
  },
  {
    name: 'windows-server',
    type: 'Windows',
    revisionName: 'v2.1',
    cores: 4,
    memory: 8192,
    storage: 80,
  },
];

// ── OData response wrappers ──────────────────────────────────────────────────

export function odataCollection<T>(items: T[]) {
  return { value: items, '@odata.count': items.length };
}
