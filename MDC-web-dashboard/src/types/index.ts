// Core Types for TS Edge Nest

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'user';
  organizationId: string;
  avatar?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  organizationId: string;
  description?: string;
  createdAt: string;
}

// Compute Types
export interface VM {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'pending' | 'error';
  projectId: string;
  vcpus: number;
  memory: number; // GB
  disk: number; // GB
  os: string;
  publicIp?: string;
  privateIp: string;
  region: string;
  zone: string;
  createdAt: string;
  tags: string[];
}

export interface VMTemplate {
  id: string;
  name: string;
  os: string;
  description: string;
  minVcpus: number;
  minMemory: number;
  minDisk: number;
  category: 'linux' | 'windows' | 'container';
}

// Networking Types
export interface VPC {
  id: string;
  name: string;
  projectId: string;
  cidr: string;
  subnets: Subnet[];
  region: string;
  createdAt: string;
}

export interface Subnet {
  id: string;
  name: string;
  cidr: string;
  zone: string;
  isPublic: boolean;
}

export interface SecurityGroup {
  id: string;
  name: string;
  vpcId: string;
  description?: string;
  rules: SecurityRule[];
  createdAt: string;
}

export interface SecurityRule {
  id: string;
  direction: 'inbound' | 'outbound';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  portRange: string;
  source: string;
  action: 'allow' | 'deny';
}

export interface LoadBalancer {
  id: string;
  name: string;
  projectId: string;
  type: 'application' | 'network';
  status: 'active' | 'provisioning' | 'error';
  publicIp?: string;
  backends: LBBackend[];
  createdAt: string;
}

export interface LBBackend {
  id: string;
  targetType: 'vm' | 'ip';
  targetId: string;
  port: number;
  healthCheck: boolean;
}

// Storage Types
export interface Volume {
  id: string;
  name: string;
  projectId: string;
  size: number; // GB
  type: 'ssd' | 'hdd';
  status: 'available' | 'in-use' | 'error';
  attachedTo?: string;
  region: string;
  createdAt: string;
}

export interface Bucket {
  id: string;
  name: string;
  projectId: string;
  region: string;
  size: number; // bytes
  objectCount: number;
  versioning: boolean;
  publicAccess: boolean;
  createdAt: string;
  storageClass: 'standard' | 'infrequent' | 'archive';
  lifecycle?: {
    enabled: boolean;
    rules: LifecycleRule[];
  };
  encryption: boolean;
  cors?: boolean;
}

export interface LifecycleRule {
  id: string;
  name: string;
  prefix?: string;
  transitionDays?: number;
  transitionClass?: 'infrequent' | 'archive';
  expirationDays?: number;
  enabled: boolean;
}

export interface FileShare {
  id: string;
  name: string;
  projectId: string;
  protocol: 'nfs' | 'smb' | 'nfs-smb';
  size: number; // GB
  used: number; // GB
  status: 'available' | 'creating' | 'error' | 'deleting';
  mountTarget: string;
  region: string;
  zone: string;
  performanceTier: 'standard' | 'premium' | 'extreme';
  accessControl: FileShareAccess[];
  createdAt: string;
}

export interface FileShareAccess {
  id: string;
  cidr: string;
  permission: 'read' | 'read-write' | 'admin';
  squash: 'none' | 'root' | 'all';
}

export interface Backup {
  id: string;
  name: string;
  projectId: string;
  sourceType: 'vm' | 'volume' | 'database' | 'file-share';
  sourceId: string;
  sourceName: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  size: number; // GB
  region: string;
  policyId?: string;
  createdAt: string;
  expiresAt?: string;
  type: 'manual' | 'scheduled';
}

export interface BackupPolicy {
  id: string;
  name: string;
  projectId: string;
  schedule: string; // cron expression
  scheduleDescription: string;
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  targets: BackupTarget[];
  status: 'active' | 'paused';
  lastRun?: string;
  nextRun: string;
  createdAt: string;
}

export interface BackupTarget {
  type: 'vm' | 'volume' | 'database' | 'file-share';
  ids: string[];
}

// Database Types
export interface Database {
  id: string;
  name: string;
  projectId: string;
  engine: 'postgresql' | 'mysql';
  version: string;
  status: 'running' | 'stopped' | 'provisioning' | 'error';
  vcpus: number;
  memory: number;
  storage: number;
  endpoint: string;
  region: string;
  createdAt: string;
  highAvailability?: boolean;
}

// Billing Types
export interface UsageMetric {
  resource: string;
  usage: number;
  unit: string;
  cost: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  period: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Admin Types
export interface Datacenter {
  id: string;
  name: string;
  location: string;
  region: string;
  status: 'online' | 'offline' | 'maintenance';
  clusters: ProxmoxCluster[];
  totalNodes: number;
  totalVMs: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
}

export interface ProxmoxCluster {
  id: string;
  name: string;
  datacenterId: string;
  status: 'healthy' | 'degraded' | 'critical';
  nodes: ProxmoxNode[];
  totalVMs: number;
  version: string;
}

export interface ProxmoxNode {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  cpuCores: number;
  cpuUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  vmCount: number;
  uptime: number;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  organization: Organization;
  status: 'active' | 'suspended' | 'pending';
  resourceUsage: {
    vms: number;
    vcpus: number;
    memory: number;
    storage: number;
  };
  monthlySpend: number;
  createdAt: string;
}

// Metrics Types
export interface TimeSeriesData {
  timestamp: string;
  value: number;
}

export interface ResourceMetrics {
  cpu: TimeSeriesData[];
  memory: TimeSeriesData[];
  network: TimeSeriesData[];
  disk: TimeSeriesData[];
}
