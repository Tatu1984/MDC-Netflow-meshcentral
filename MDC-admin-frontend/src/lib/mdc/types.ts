// ==================== Core Entities ====================

export interface Organization {
  id: string; // UUID
  name: string;
  description?: string;
  active: boolean;
  organizationUserRoles?: OrganizationUserRole[];
  siteIds?: string[]; // UUIDs
  workspaceIds?: string[]; // UUIDs
  sites?: Site[]; // Expanded via $expand=sites
}

export interface OrganizationUserRole {
  organizationId: string;
  organizationName: string;
  role: string;
  userId: string;
  userName: string;
}

export interface Site {
  id: string; // UUID
  name: string;
  description?: string;
  clusterName?: string | null;
  siteNodes?: SiteNode[];
  // legacy field kept for compatibility
  nodes?: SiteNode[];
  organizationIds?: string[];
  workspaceIds?: string[];
  gatewayTemplates?: VirtualMachineTemplate[];
  bastionTemplates?: VirtualMachineTemplate[];
  virtualMachineTemplates?: VirtualMachineTemplate[];
}

export interface SiteNode {
  id: string; // UUID — needed for RemoveNode
  name: string;
  machineId?: string;
  serialNumber?: string;
  registered?: string; // ISO DateTime
  hostName?: string | null;
  cpuInfo?: SiteNodeCPUInfo | null;
  authorized?: boolean;
  online: boolean;
  configured?: boolean;
}

export interface SiteNodeCPUInfo {
  sockets: number;
  cores: number;
  model: string;
  cpUs: number;
  mhz: number;
}

export interface User {
  id: string; // UUID
  displayName: string;
  emailAddress?: string;
  isRegistered: boolean;
  appRoles: string[];
  organizationRoles: UserOrganizationRole[];
}

export interface UserOrganizationRole {
  organizationId: string;
  role: string;
}

export interface Workspace {
  id: string; // UUID
  virtualMachines?: VirtualMachine[];
  virtualNetworks: VirtualNetwork[];
  siteId: string;
  organizationId: string;
  address: number;
  name: string;
  description?: string;
  locked: boolean; // Prevents modification when true
  createdAt: string; // ISO DateTime
  updatedAt: string; // ISO DateTime
  bastion?: VirtualMachine;
}

export interface RemoteNetwork {
  id: string;
  members: RemoteNetworkMember[];
  name?: string;
  siteId: string;
  workspaceId: string;
  virtualNetworkId: string;
  ipAssignmentPools?: RemoteNetworkIPAssignmentPool[];
  managedRoutes?: RemoteNetworkRoute[];
}

// ==================== Virtual Machine Types ====================

export interface VirtualMachine {
  index: number;
  name: string;
  status?: string;
  networkAdapters?: VirtualMachineNetworkAdapter[];
}

export interface VirtualMachineNetworkAdapter {
  name: string;
  virtualNetworkId?: string;
  macAddress?: string;
  isDisconnected: boolean;
  networkInterfaces?: VirtualMachineNetworkInterface[];
}

export interface VirtualMachineNetworkInterface {
  name: string;
  macAddress: string;
  ipAddress?: string;
  prefix?: number;
}

export interface VirtualMachineTemplate {
  name: string;
  revision: number;
  cores?: number;
  memory?: string;
  storage?: VirtualMachineTemplateStorage[];
}

export interface VirtualMachineTemplateStorage {
  controllerType: string;
  controllerIndex: number;
  size?: number;
}

// ==================== Virtual Network Types ====================

export interface VirtualNetwork {
  id: string; // UUID
  index: number;
  name: string;
  tag?: number;
  remoteNetworkId?: string;
}

// ==================== Remote Network Types ====================

export interface RemoteNetworkMember {
  id: string;
  name?: string;
  description?: string;
  ipAddresses?: string[];
  online: boolean;
  authorized: boolean;
  created: string; // ISO DateTime
  lastOnline?: string;
  latency?: number;
  phyiscalIPAddress?: string; // Note: typo in API
  clientVersion?: string;
}

export interface RemoteNetworkIPAssignmentPool {
  ipRangeEnd: string;
  ipRangeStart: string;
}

export interface RemoteNetworkRoute {
  target: string;
  via?: string;
}

// ==================== Descriptor Types (for creating/updating) ====================

export interface WorkspaceDescriptor {
  name: string;
  description?: string;
  bastion?: BastionDescriptor;
  virtualNetworks?: VirtualNetworkDescriptor[];
  virtualMachines?: VirtualMachineDescriptor[];
}

export interface BastionDescriptor {
  templateName?: string;
  templateRevision?: number;
  operation?: VirtualMachineDescriptorOperation;
}

export interface VirtualNetworkDescriptor {
  name?: string;
  gateway?: VirtualNetworkGatewayDescriptor;
  enableRemoteNetwork: boolean;
  remoteNetworkAddressCIDR?: string;
  remoteNetworkIPRangeStart?: string;
  remoteNetworkIPRangeEnd?: string;
  remoteNetworkBastionIPAddress?: string;
  operation?: VirtualNetworkDescriptorOperation;
}

export interface VirtualNetworkGatewayDescriptor {
  templateName?: string;
  templateRevision?: number;
  wanNetworkType?: VirtualNetworkGatewayWANNetworkType;
  refInternalWANVirtualNetworkName?: string;
  operation?: VirtualMachineDescriptorOperation;
}

export interface VirtualMachineDescriptor {
  name?: string;
  templateName?: string;
  templateRevision?: number;
  cpuCores?: number;
  memoryMB?: string;
  networkAdapters?: VirtualMachineNetworkAdapterDescriptor[];
  operation?: VirtualMachineDescriptorOperation;
}

export interface VirtualMachineNetworkAdapterDescriptor {
  name?: string;
  refVirtualNetworkName?: string;
  macAddress?: string;
  isDisconnected?: boolean;
  isFirewallEnabled?: boolean;
  enableRemoteNetwork: boolean;
  remoteNetworkIPAddress?: string;
  operation?: VirtualNetworkDescriptorOperation;
}

// ==================== Enums ====================

export enum VirtualMachineDescriptorOperation {
  None = 0,
  Add = 1,
  Update = 2,
  Remove = 3,
  Reboot = 4,
  Restart = 5,
  Redeploy = 6,
}

export enum VirtualNetworkDescriptorOperation {
  None = 0,
  Add = 1,
  Update = 2,
  Remove = 3,
}

export enum VirtualNetworkGatewayWANNetworkType {
  Egress = 0,
  Internal = 1,
  Public = 2,
}

// ==================== OData Response Types ====================

export interface ODataResponse<T> {
  '@odata.context'?: string;
  '@odata.count'?: number;
  value: T[];
}

export type ODataSingleResponse<T> = T & {
  '@odata.context'?: string;
}

// ==================== Site Descriptor Types ====================

export interface SiteDescriptor {
  memberAddress: string; // ZeroTier node address
  serialNumber?: string;
  machineId?: string;
  registrationUserName: string; // Proxmox user
  registrationPassword: string; // Proxmox password
  description?: string;
  validateServerCertificate?: boolean;
  port?: number;
  timeout?: number;
  organizationIds?: string[];
  importToOrganizationId?: string;
  dataEgressOnMgmtNetwork?: boolean;
}

export interface SiteUpdateDescriptor {
  name?: string;
  description?: string;
  addOrganizationIds?: string[];
  removeOrganizationIds?: string[];
}

export interface RemoveNodeDescriptor {
  siteNodeId: string;
}

// ==================== Template Types ====================

export interface Template {
  name: string;
  revision: number;
  type: 'gateway' | 'bastion' | 'virtualMachine';
  description?: string;
  cores?: number;
  memory?: string;
  storage?: VirtualMachineTemplateStorage[];
}

// Full shape returned by GET /odata/Sites({id})/DownloadableTemplates
export interface DownloadableTemplate {
  name: string;
  revision: number;
  cores?: number | null;
  memory?: string | null;
  size?: number;
  type: string; // "VM" | "GW"
  downloaded: boolean;
  digest: string;
  storage?: VirtualMachineTemplateStorage[];
}

// POST /odata/Sites({id})/DownloadTemplate body — send the full template object
export interface DownloadTemplateDescriptor {
  name: string;
  revision: number;
  cores?: number | null;
  memory?: string | null;
  size?: number;
  type: string;
  downloaded: boolean;
  digest: string;
  storage?: VirtualMachineTemplateStorage[];
}

// ==================== Organization Descriptor Types ====================

export interface OrganizationDescriptor {
  name: string;
  description: string;
  organizationUserRoles?: OrganizationUserRoleDescriptor[];
  siteIds: string[];
}

export interface OrganizationUserRoleDescriptor {
  userId: string;
  role: string;
}

// PATCH /odata/Organizations({id}) body
export interface OrganizationUpdateDescriptor {
  name: string;
  description: string;
  addOrganizationUserRoles: OrganizationUserRoleDescriptor[];
  removeOrganizationUserRoles: OrganizationUserRoleDescriptor[];
  addSiteIds: string[];
  removeSiteIds: string[];
}

// ==================== Remote Network Update Types ====================

export interface RemoteNetworkUpdate {
  ipAssignmentPools?: RemoteNetworkIPAssignmentPool[];
  managedRoutes?: RemoteNetworkRoute[];
  members?: RemoteNetworkMemberUpdate[];
}

export interface RemoteNetworkMemberUpdate {
  id: string;
  authorized?: boolean;
  name?: string;
  description?: string;
  ipAssignments?: string[];
}

// ==================== User Registration Types ====================

export interface UserRegistrationDescriptor {
  id: string; // Azure AD Object ID
  organizationRoles?: UserOrganizationRole[];
  applicationRoles?: string[];
}

export interface UserUpdateDescriptor {
  addOrganizationRoles?: UserOrganizationRole[];
  removeOrganizationRoles?: UserOrganizationRole[];
  addApplicationRoles?: string[];
  removeApplicationRoles?: string[];
}

// ==================== Workspace Lock Types ====================

export interface WorkspaceLockDescriptor {
  locked: boolean;
}

// ==================== API Error Types ====================

export interface MDCApiError {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{
      code?: string;
      message?: string;
      target?: string;
    }>;
  };
}
