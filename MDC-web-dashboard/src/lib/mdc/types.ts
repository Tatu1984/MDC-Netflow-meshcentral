// MicroDataCluster API Types
// Based on https://www.microdatacluster.com/swagger/index.html

// ==================== Core Entities ====================

export interface Organization {
  id: string; // UUID
  name: string;
  description?: string;
  active: boolean;
  organizationUserRoles?: OrganizationUserRole[];
  siteIds?: string[]; // UUIDs — not always returned by API
  workspaceIds?: string[]; // UUIDs — not always returned by API
  sites?: Site[]; // populated via $expand=sites
  workspaces?: Workspace[]; // populated via $expand=workspaces
}

export interface OrganizationUserRole {
  organizationId: string;
  organizationName: string;
  role: string;
  userId: string;
  userName?: string; // not always present in API response
}

export interface Site {
  id: string; // UUID
  name: string;
  description?: string;
  clusterName?: string;
  siteNodes?: SiteNode[];
  /** @deprecated API now returns siteNodes */
  nodes?: SiteNode[];
  organizations?: Organization[];
  organizationIds?: string[];
  workspaceIds?: string[];
  workspaces?: Workspace[]; // populated via $expand=workspaces
  gatewayTemplates?: VirtualMachineTemplate[];
  bastionTemplates?: VirtualMachineTemplate[];
  virtualMachineTemplates?: VirtualMachineTemplate[];
}

export interface SiteNode {
  id?: string;
  name: string;
  machineId?: string;
  serialNumber?: string;
  registered?: string;
  hostName?: string;
  cpu?: number;
  cpuInfo?: SiteNodeCPUInfo;
  authorized?: boolean;
  online: boolean;
  configured?: boolean;
  storage?: { maxDisk?: number; disk?: number };
  memory?: { used?: number; total?: number; free?: number };
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
  // Populated via $expand=organization,site
  organization?: Organization;
  site?: Site;
}

export interface RemoteNetwork {
  id: string;
  networkId?: string;
  members: RemoteNetworkMember[];
  name?: string;
  // siteId / workspaceId are declared required by the backend model but the
  // OData response has been observed returning records without them (e.g. when
  // the projected DTO's Workspace nav is null). Treat as optional defensively.
  siteId?: string;
  workspaceId?: string;
  virtualNetworkId: string;
  ipAssignmentPools?: RemoteNetworkIPAssignmentPool[];
  managedRoutes?: RemoteNetworkRoute[];
}

// ==================== Virtual Machine Types ====================

export interface VirtualMachine {
  index: number;
  name: string;
  status?: string;
  cores?: number;
  memory?: string;
  templateName?: string;
  templateRevision?: number;
  storage?: VirtualMachineTemplateStorage[];
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
  gatewayStatus?: string;
  gatewayWANNetworkType?: string;
  gatewayWANVirtualNetworkId?: string;
  cores?: number;
  memory?: string;
  templateName?: string;
  templateRevision?: number;
  tag?: number;
  remoteNetworkId?: string;
  zeroTierNetworkId?: string;
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
  organizationId?: string;
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
  None = "None",
  Add = "add",
  Update = "Update",
  Remove = "Remove",
  Reboot = "Reboot",
  Restart = "Restart",
  Redeploy = "Redeploy",
}

export enum VirtualNetworkDescriptorOperation {
  None = "None",
  Add = "add",
  Update = "Update",
  Remove = "Remove",
}

export enum VirtualNetworkGatewayWANNetworkType {
  Egress = "Egress",
  Internal = "Internal",
  Public = "Public",
}

// ==================== OData Response Types ====================

export interface ODataResponse<T> {
  '@odata.context'?: string;
  '@odata.count'?: number;
  value: T[];
}

export type ODataSingleResponse<T> = T & {
  '@odata.context'?: string;
};

// ==================== Site Descriptor Types ====================

export interface SiteDescriptor {
  memberAddress: string; // ZeroTier node address
  registrationUserName: string; // Proxmox user
  registrationPassword: string; // Proxmox password
  description?: string;
  validateServerCertificate?: boolean;
  port?: number;
  timeout?: number;
  organizationIds?: string[];
  importToOrganizationId?: string;
}

// ==================== Template Types ====================

export interface Template {
  name: string;
  revision: number;
  type: string;
  cores?: number;
  memory?: string;
  storage?: VirtualMachineTemplateStorage[];
  size?: number;
  downloaded: boolean;
  digest: string;
}

export interface DownloadTemplateDescriptor {
  digest: string;
}

// ==================== Organization Descriptor Types ====================

export interface OrganizationDescriptor {
  name: string;
  organizationUserRoles?: OrganizationUserRoleDescriptor[];
  siteIds: string[];
}

export interface OrganizationUserRoleDescriptor {
  userId: string;
  role: string;
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

// ==================== Activity Logs ====================

export interface ActivityLogUser {
  id: string;
  isRegistered?: boolean;
  displayName?: string;
  emailAddress?: string;
  appRoles?: string[];
  organizationRoles?: UserOrganizationRole[];
}

export interface ActivityLog {
  id: string;
  entityName: string;
  entityId: string;
  action: 'Added' | 'Modified' | 'Deleted' | string;
  changesJson: string;
  userId: string;
  timestampUtc: string;
  user?: ActivityLogUser;
}

export interface ActivityLogsParams {
  page: number;
  pageSize: number;
  entityName?: string;
  orderBy?: string;
}

export interface ActivityLogsPage {
  items: ActivityLog[];
  total: number;
  page: number;
  pageSize: number;
}
