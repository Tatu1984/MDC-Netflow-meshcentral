"use client";

import { useState } from "react";
import {
  Search,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  Filter,
  Server,
  Layers,
  Database,
  Globe,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Clock,
  Copy,
  ExternalLink,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  sourceType: "vm" | "cluster" | "database" | "loadbalancer";
  message: string;
  details?: {
    requestId?: string;
    userId?: string;
    duration?: string;
    statusCode?: number;
    path?: string;
    method?: string;
    ip?: string;
    stackTrace?: string;
  };
}

const mockLogs: LogEntry[] = [
  {
    id: "log-001",
    timestamp: "2026-01-12T14:32:45.123Z",
    level: "error",
    source: "web-prod-01",
    sourceType: "vm",
    message: "Connection refused to database server db-primary:5432",
    details: {
      requestId: "req-abc123",
      stackTrace: "Error: ECONNREFUSED\n    at TCPConnectWrap.afterConnect\n    at DatabaseConnection.connect\n    at Pool.acquire",
    },
  },
  {
    id: "log-002",
    timestamp: "2026-01-12T14:32:44.892Z",
    level: "warn",
    source: "k8s-production",
    sourceType: "cluster",
    message: "Pod memory usage exceeds 80% threshold: api-deployment-7d8f9c5b4-x2k9m",
    details: {
      requestId: "pod-monitor-001",
    },
  },
  {
    id: "log-003",
    timestamp: "2026-01-12T14:32:44.567Z",
    level: "info",
    source: "api-server",
    sourceType: "vm",
    message: "HTTP request completed successfully",
    details: {
      requestId: "req-def456",
      method: "POST",
      path: "/api/v1/users",
      statusCode: 201,
      duration: "125ms",
      ip: "192.168.1.45",
    },
  },
  {
    id: "log-004",
    timestamp: "2026-01-12T14:32:44.234Z",
    level: "debug",
    source: "web-prod-02",
    sourceType: "vm",
    message: "Cache hit for key: user_session_abc123",
    details: {
      requestId: "req-ghi789",
    },
  },
  {
    id: "log-005",
    timestamp: "2026-01-12T14:32:43.901Z",
    level: "error",
    source: "db-primary",
    sourceType: "database",
    message: "Query timeout exceeded 30s limit",
    details: {
      requestId: "query-001",
      duration: "30.5s",
    },
  },
  {
    id: "log-006",
    timestamp: "2026-01-12T14:32:43.678Z",
    level: "info",
    source: "lb-frontend",
    sourceType: "loadbalancer",
    message: "Health check passed for backend web-prod-01",
  },
  {
    id: "log-007",
    timestamp: "2026-01-12T14:32:43.345Z",
    level: "warn",
    source: "k8s-production",
    sourceType: "cluster",
    message: "Container restart detected: redis-cache-0 (restart count: 3)",
    details: {
      requestId: "container-watch-002",
    },
  },
  {
    id: "log-008",
    timestamp: "2026-01-12T14:32:43.012Z",
    level: "info",
    source: "api-server",
    sourceType: "vm",
    message: "User authentication successful",
    details: {
      requestId: "req-jkl012",
      userId: "user-12345",
      method: "POST",
      path: "/api/v1/auth/login",
      statusCode: 200,
      duration: "45ms",
    },
  },
  {
    id: "log-009",
    timestamp: "2026-01-12T14:32:42.789Z",
    level: "debug",
    source: "web-prod-01",
    sourceType: "vm",
    message: "Static asset served from CDN cache",
    details: {
      path: "/static/js/main.bundle.js",
      duration: "2ms",
    },
  },
  {
    id: "log-010",
    timestamp: "2026-01-12T14:32:42.456Z",
    level: "error",
    source: "api-server",
    sourceType: "vm",
    message: "Rate limit exceeded for IP 203.45.67.89",
    details: {
      ip: "203.45.67.89",
      path: "/api/v1/data",
      method: "GET",
    },
  },
  {
    id: "log-011",
    timestamp: "2026-01-12T14:32:42.123Z",
    level: "info",
    source: "db-primary",
    sourceType: "database",
    message: "Backup completed successfully",
    details: {
      duration: "5m 23s",
    },
  },
  {
    id: "log-012",
    timestamp: "2026-01-12T14:32:41.890Z",
    level: "warn",
    source: "lb-frontend",
    sourceType: "loadbalancer",
    message: "High latency detected on backend web-prod-02 (avg: 850ms)",
  },
];

const sources = [
  { id: "all", name: "All Sources", type: "all" },
  { id: "web-prod-01", name: "web-prod-01", type: "vm" },
  { id: "web-prod-02", name: "web-prod-02", type: "vm" },
  { id: "api-server", name: "api-server", type: "vm" },
  { id: "db-primary", name: "db-primary", type: "database" },
  { id: "k8s-production", name: "k8s-production", type: "cluster" },
  { id: "lb-frontend", name: "lb-frontend", type: "loadbalancer" },
];

const levelConfig: Record<LogLevel, { icon: typeof Info; color: string; bgColor: string }> = {
  info: { icon: Info, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  warn: { icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  error: { icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  debug: { icon: Bug, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30" },
};

const sourceTypeIcons: Record<string, typeof Server> = {
  vm: Server,
  cluster: Layers,
  database: Database,
  loadbalancer: Globe,
};

function LogEntryRow({ log }: { log: LogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = levelConfig[log.level];
  const LevelIcon = config.icon;
  const SourceIcon = sourceTypeIcons[log.sourceType];

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={`border-b border-border hover:bg-muted/50 transition-colors ${
          isExpanded ? "bg-muted/30" : ""
        }`}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-start gap-3 p-3 cursor-pointer">
            <div className="flex items-center gap-2 shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div className={`p-1 rounded ${config.bgColor}`}>
                <LevelIcon className={`h-3 w-3 ${config.color}`} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <code className="text-xs text-muted-foreground font-mono">
                  {formatTimestamp(log.timestamp)}
                </code>
                <Badge variant="outline" className="text-xs">
                  <SourceIcon className="h-3 w-3 mr-1" />
                  {log.source}
                </Badge>
                <Badge
                  variant={
                    log.level === "error"
                      ? "destructive"
                      : log.level === "warn"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-xs uppercase"
                >
                  {log.level}
                </Badge>
              </div>
              <p className="text-sm font-mono truncate">{log.message}</p>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-12 pb-4 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy JSON
              </Button>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-3 w-3 mr-1" />
                View in Context
              </Button>
            </div>

            {log.details && (
              <div className="bg-muted/50 rounded-md p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Details</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {log.details.requestId && (
                    <div>
                      <p className="text-xs text-muted-foreground">Request ID</p>
                      <code className="text-xs">{log.details.requestId}</code>
                    </div>
                  )}
                  {log.details.method && (
                    <div>
                      <p className="text-xs text-muted-foreground">Method</p>
                      <code className="text-xs">{log.details.method}</code>
                    </div>
                  )}
                  {log.details.path && (
                    <div>
                      <p className="text-xs text-muted-foreground">Path</p>
                      <code className="text-xs">{log.details.path}</code>
                    </div>
                  )}
                  {log.details.statusCode && (
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <code className="text-xs">{log.details.statusCode}</code>
                    </div>
                  )}
                  {log.details.duration && (
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <code className="text-xs">{log.details.duration}</code>
                    </div>
                  )}
                  {log.details.ip && (
                    <div>
                      <p className="text-xs text-muted-foreground">IP Address</p>
                      <code className="text-xs">{log.details.ip}</code>
                    </div>
                  )}
                  {log.details.userId && (
                    <div>
                      <p className="text-xs text-muted-foreground">User ID</p>
                      <code className="text-xs">{log.details.userId}</code>
                    </div>
                  )}
                </div>
                {log.details.stackTrace && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Stack Trace</p>
                    <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                      {log.details.stackTrace}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              Full timestamp: {new Date(log.timestamp).toISOString()}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>(["info", "warn", "error", "debug"]);
  const [timeRange, setTimeRange] = useState("1h");
  const [isLive, setIsLive] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const toggleLevel = (level: LogLevel) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = selectedSource === "all" || log.source === selectedSource;
    const matchesLevel = selectedLevels.includes(log.level);
    return matchesSearch && matchesSource && matchesLevel;
  });

  const logStats = {
    total: mockLogs.length,
    error: mockLogs.filter((l) => l.level === "error").length,
    warn: mockLogs.filter((l) => l.level === "warn").length,
    info: mockLogs.filter((l) => l.level === "info").length,
    debug: mockLogs.filter((l) => l.level === "debug").length,
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Logs"
        apis={[
          "GET /api/logs",
          "POST /api/logs/search",
          "GET /api/logs/sources",
          "POST /api/logs/export"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">
            Explore and search logs from all your resources
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isLive ? "default" : "outline"}
            onClick={() => setIsLive(!isLive)}
            className="gap-2"
          >
            <div
              className={`h-2 w-2 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-gray-400"}`}
            />
            {isLive ? "Live" : "Paused"}
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{logStats.total}</p>
              </div>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{logStats.error}</p>
              </div>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{logStats.warn}</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Info</p>
                <p className="text-2xl font-bold text-blue-600">{logStats.info}</p>
              </div>
              <Info className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Debug</p>
                <p className="text-2xl font-bold text-gray-600">{logStats.debug}</p>
              </div>
              <Bug className="h-4 w-4 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs by message, source, or request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Log Levels ({selectedLevels.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Log Levels</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={selectedLevels.includes("error")}
                  onCheckedChange={() => toggleLevel("error")}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-red-600" />
                    Error
                  </div>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedLevels.includes("warn")}
                  onCheckedChange={() => toggleLevel("warn")}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                    Warning
                  </div>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedLevels.includes("info")}
                  onCheckedChange={() => toggleLevel("info")}
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-3 w-3 text-blue-600" />
                    Info
                  </div>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedLevels.includes("debug")}
                  onCheckedChange={() => toggleLevel("debug")}
                >
                  <div className="flex items-center gap-2">
                    <Bug className="h-3 w-3 text-gray-600" />
                    Debug
                  </div>
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">Last 15 min</SelectItem>
                <SelectItem value="1h">Last 1 hour</SelectItem>
                <SelectItem value="6h">Last 6 hours</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <LogEntryRow key={log.id} log={log} />
              ))}
              {filteredLogs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No logs found matching your filters</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedSource("all");
                      setSelectedLevels(["info", "warn", "error", "debug"]);
                    }}
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
