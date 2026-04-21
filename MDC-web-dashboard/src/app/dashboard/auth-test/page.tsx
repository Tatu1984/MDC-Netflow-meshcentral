"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  ChevronDown,
  Copy,
  User,
  ShieldCheck,
  Wrench,
  UserCog,
  Users,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { getMsalInstance, getMdcApiRequest } from "@/lib/msal-config";
import { getEnv } from "@/lib/env";

// ─── Types ───────────────────────────────────────────────────────────────────

type TestStatus = "idle" | "loading" | "success" | "error";

interface TestResult {
  endpoint: string;
  status: TestStatus;
  statusCode?: number;
  data?: Record<string, unknown> | null;
  error?: string;
  duration?: number;
}

interface TestEndpoint {
  name: string;
  endpoint: string;
  description: string;
  icon: React.ReactNode;
  requiredRole?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TEST_ENDPOINTS: TestEndpoint[] = [
  {
    name: "Anonymous",
    endpoint: "/api/AuthTest/anonymous",
    description: "Accessible without authentication",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    name: "Authenticated",
    endpoint: "/api/AuthTest/authenticated",
    description: "Requires any valid authentication",
    icon: <User className="h-4 w-4" />,
  },
  {
    name: "Admin Only",
    endpoint: "/api/AuthTest/admin",
    description: "Requires GlobalAdministrator role",
    icon: <ShieldCheck className="h-4 w-4" />,
    requiredRole: "GlobalAdministrator",
  },
  {
    name: "Technician Only",
    endpoint: "/api/AuthTest/technician",
    description: "Requires DatacenterTechnician role",
    icon: <Wrench className="h-4 w-4" />,
    requiredRole: "DatacenterTechnician",
  },
  {
    name: "Manager Only",
    endpoint: "/api/AuthTest/manager",
    description: "Requires WorkspaceManager role",
    icon: <UserCog className="h-4 w-4" />,
    requiredRole: "WorkspaceManager",
  },
  {
    name: "User Only",
    endpoint: "/api/AuthTest/user",
    description: "Requires WorkspaceUser role",
    icon: <Users className="h-4 w-4" />,
    requiredRole: "WorkspaceUser",
  },
];

function initResults(): Record<string, TestResult> {
  return Object.fromEntries(
    TEST_ENDPOINTS.map((ep) => [ep.endpoint, { endpoint: ep.endpoint, status: "idle" }])
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status, statusCode }: { status: TestStatus; statusCode?: number }) {
  if (status === "idle") return <Badge variant="secondary">Idle</Badge>;
  if (status === "loading") return <Badge variant="outline">Running…</Badge>;
  if (status === "success")
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
        {statusCode ?? "OK"}
      </Badge>
    );
  return (
    <Badge variant="destructive">
      {statusCode ?? "Error"}
    </Badge>
  );
}

function StatusIcon({ status }: { status: TestStatus }) {
  if (status === "success") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuthTestPage() {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>(initResults);
  const [envConfig, setEnvConfig] = useState<Awaited<ReturnType<typeof getEnv>> | null>(null);

  // Load runtime env config once
  useEffect(() => {
    getEnv().then(setEnvConfig).catch(() => null);
  }, []);

  // ── Token fetch ──────────────────────────────────────────────────────────

  const fetchToken = async () => {
    setTokenLoading(true);
    setTokenError(null);
    try {
      // Try MSAL first (acquires silently with MDC scope)
      const msal = await getMsalInstance();
      if (msal) {
        const accounts = msal.getAllAccounts();
        if (accounts.length > 0) {
          const request = await getMdcApiRequest();
          try {
            const response = await msal.acquireTokenSilent({ ...request, account: accounts[0] });
            setToken(response.accessToken);
            setTokenLoading(false);
            return;
          } catch {
            // Silent failed (iframe timeout / consent required) — fallback to popup
            const response = await msal.acquireTokenPopup({ ...request, account: accounts[0] });
            setToken(response.accessToken);
            setTokenLoading(false);
            return;
          }
        }
      }
      // Fallback: use the ID token stored in the auth store or localStorage
      const stored = accessToken || localStorage.getItem("accessToken");
      if (stored) {
        setToken(stored);
      } else {
        setTokenError("No token available — make sure you are signed in.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Token acquisition failed";
      setTokenError(msg);
    } finally {
      setTokenLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ── Copy token ───────────────────────────────────────────────────────────

  const copyToken = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    toast({ title: "Copied", description: "Token copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Endpoint testing ─────────────────────────────────────────────────────

  const runTest = async (endpoint: string) => {
    setResults((prev) => ({
      ...prev,
      [endpoint]: { ...prev[endpoint], status: "loading" },
    }));

    const t0 = performance.now();
    try {
      const env = await getEnv();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${env.apiUrl}${endpoint}`, { headers });
      const duration = Math.round(performance.now() - t0);

      let data: Record<string, unknown> | null = null;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await res.json() as Record<string, unknown>;
      }

      setResults((prev) => ({
        ...prev,
        [endpoint]: {
          endpoint,
          status: res.ok ? "success" : "error",
          statusCode: res.status,
          data,
          duration,
        },
      }));
    } catch (err) {
      const duration = Math.round(performance.now() - t0);
      setResults((prev) => ({
        ...prev,
        [endpoint]: {
          endpoint,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
          duration,
        },
      }));
    }
  };

  const runAll = async () => {
    for (const ep of TEST_ENDPOINTS) {
      await runTest(ep.endpoint);
    }
  };

  const resetAll = () => setResults(initResults());

  // ── Decoded token payload ────────────────────────────────────────────────

  const decodedPayload = (() => {
    if (!token) return null;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1])) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();

  const anyRunning = Object.values(results).some((r) => r.status === "loading");
  const anyTested = Object.values(results).some((r) => r.status !== "idle");

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Authentication Test</h1>
          <p className="text-muted-foreground">
            Test API authentication and authorization endpoints
          </p>
        </div>
      </div>

      {/* ── Config accordion ──────────────────────────────────── */}
      <Accordion type="single" collapsible>
        <AccordionItem value="config" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">
            Configuration Details
          </AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableBody>
                {[
                  ["SPA Client ID", envConfig?.entraClientId],
                  ["Authority", envConfig?.entraAuthority],
                  ["API Scope", envConfig?.mdcScope],
                  ["API URL", envConfig?.apiUrl],
                ].map(([label, value]) => (
                  <TableRow key={label}>
                    <TableCell className="font-semibold w-40">{label}</TableCell>
                    <TableCell className="font-mono text-xs break-all">
                      {value || <span className="text-muted-foreground">Not set</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ── User + Token row ──────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* User card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge
                className={
                  isAuthenticated
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }
              >
                {isAuthenticated ? "Authenticated" : "Not Authenticated"}
              </Badge>
            </div>
            {user && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Token card (spans 2 cols) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Access Token</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchToken}
                  disabled={tokenLoading || !isAuthenticated}
                >
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${tokenLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToken}
                  disabled={!token}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tokenLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : tokenError ? (
              <Alert variant="destructive">
                <AlertTitle>Token Error</AlertTitle>
                <AlertDescription>{tokenError}</AlertDescription>
              </Alert>
            ) : token ? (
              <div className="space-y-3">
                <div className="rounded-md bg-muted p-3 max-h-24 overflow-auto">
                  <p className="font-mono text-xs break-all">{token}</p>
                </div>

                {decodedPayload && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="payload" className="border rounded-md px-3">
                      <AccordionTrigger className="text-xs font-medium py-2">
                        Decoded Token Payload
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div className="rounded-md bg-muted p-3 max-h-48 overflow-auto">
                          <pre className="text-xs font-mono">
                            {JSON.stringify(decodedPayload, null, 2)}
                          </pre>
                        </div>
                        <Table>
                          <TableBody>
                            {[
                              ["Audience (aud)", decodedPayload.aud],
                              ["Issuer (iss)", decodedPayload.iss],
                              ["Scopes (scp)", decodedPayload.scp],
                              [
                                "Roles",
                                Array.isArray(decodedPayload.roles)
                                  ? (decodedPayload.roles as string[]).join(", ")
                                  : decodedPayload.roles,
                              ],
                              [
                                "Expires",
                                decodedPayload.exp
                                  ? new Date((decodedPayload.exp as number) * 1000).toLocaleString()
                                  : undefined,
                              ],
                            ].map(([label, value]) => (
                              <TableRow key={String(label)}>
                                <TableCell className="font-semibold text-xs w-32">
                                  {String(label)}
                                </TableCell>
                                <TableCell className="font-mono text-xs break-all">
                                  {value != null ? String(value) : <span className="text-muted-foreground">N/A</span>}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No token available. Make sure you are authenticated.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Endpoint tests ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Endpoint Tests</CardTitle>
              <CardDescription>
                Run individual or all endpoint tests to verify authorization
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetAll} disabled={anyRunning || !anyTested}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Reset All
              </Button>
              <Button onClick={runAll} disabled={!token || anyRunning}>
                <Play className="mr-2 h-3.5 w-3.5" />
                Test All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!token && (
            <Alert className="mb-4">
              <AlertDescription>
                Waiting for access token before tests can run.
              </AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Required Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEST_ENDPOINTS.map((ep) => {
                const result = results[ep.endpoint];
                return (
                  <TableRow key={ep.endpoint}>
                    <TableCell className="text-muted-foreground">{ep.icon}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{ep.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{ep.endpoint}</p>
                    </TableCell>
                    <TableCell className="text-sm">{ep.description}</TableCell>
                    <TableCell>
                      {ep.requiredRole ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                          {ep.requiredRole}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={result?.status} />
                        <StatusBadge status={result?.status} statusCode={result?.statusCode} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {result?.duration !== undefined ? `${result.duration}ms` : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runTest(ep.endpoint)}
                        disabled={result?.status === "loading" || !token}
                      >
                        <Play className="mr-1.5 h-3 w-3" />
                        Test
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Response details ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Response Details</CardTitle>
          <CardDescription>Expand each endpoint to inspect the response body</CardDescription>
        </CardHeader>
        <CardContent>
          {!anyTested ? (
            <Alert>
              <AlertDescription>
                No tests have been run yet. Click &quot;Test&quot; on individual endpoints or &quot;Test All&quot; to begin.
              </AlertDescription>
            </Alert>
          ) : (
            <Accordion type="multiple" className="space-y-1">
              {TEST_ENDPOINTS.map((ep) => {
                const result = results[ep.endpoint];
                if (!result || result.status === "idle") return null;
                return (
                  <AccordionItem
                    key={ep.endpoint}
                    value={ep.endpoint}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={result.status} />
                        <span className="font-medium text-sm">{ep.name}</span>
                        {result.statusCode && (
                          <StatusBadge status={result.status} statusCode={result.statusCode} />
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {result.status === "loading" ? (
                        <div className="space-y-2 py-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      ) : result.status === "error" ? (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-3 pt-1">
                          <div className="rounded-md bg-muted p-3 max-h-72 overflow-auto">
                            <pre className="text-xs font-mono">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </div>

                          {/* Claims table if backend returns claims array */}
                          {result.data &&
                            typeof result.data === "object" &&
                            "claims" in result.data &&
                            Array.isArray((result.data as Record<string, unknown>)["claims"]) && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Token Claims</p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Claim Type</TableHead>
                                      <TableHead>Value</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(
                                      (result.data as { claims: { Type: string; Value: string }[] })
                                        .claims
                                    ).map((claim, i) => (
                                      <TableRow key={i}>
                                        <TableCell className="font-mono text-xs">
                                          {claim.Type}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                          {claim.Value}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
