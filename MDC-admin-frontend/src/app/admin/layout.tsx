"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/stores/auth-store";
import {
  fetchRuntimeConfig,
  setMdcApiUrl,
  setMdcScope,
  getMdcApiUrl,
  getMsalInstance,
  setMsalInstance,
  buildMsalConfig,
} from "@/lib/msal-config";
import { PublicClientApplication } from "@azure/msal-browser";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;

    // If setMdcApiUrl was already called (e.g. via the login page), mark ready immediately.
    try {
      getMdcApiUrl();
      setConfigReady(true);
      return;
    } catch {
      // URL not set — fetch config now before rendering any child that calls MDC APIs.
    }

    fetchRuntimeConfig()
      .then(async (config) => {
        setMdcApiUrl(config.mdcApiUrl);
        setMdcScope(config.mdcScope);

        // Rebuild the MSAL instance if it was lost on reload.
        // The session data is still in sessionStorage; initialize() will restore it.
        if (!getMsalInstance()) {
          const instance = new PublicClientApplication(buildMsalConfig(config));
          setMsalInstance(instance);
          await instance.initialize();
        }

        setConfigReady(true);
      })
      .catch((err) => {
        console.error('Failed to fetch runtime config in admin layout:', err);
        // Still mark ready so the UI doesn't hang; pages will show their own API errors.
        setConfigReady(true);
      });
  }, [_hasHydrated, isAuthenticated]);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/auth/admin/login");
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Show loading spinner while Zustand hydrates from localStorage.
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  // Hold rendering children until runtime config (MDC_API_URL) is confirmed set.
  // This prevents MDC queries from firing before the API base URL is available.
  if (!configReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
