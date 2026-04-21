"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Cloud, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export default function NotFound() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When not authenticated, force light theme for the 404 page
  useEffect(() => {
    if (!mounted || !_hasHydrated) return;
    if (!isAuthenticated) {
      setTheme("light");
    }
  }, [mounted, _hasHydrated, isAuthenticated, setTheme]);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-border">
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-2 w-fit hover:opacity-80 transition-opacity"
        >
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Cloud className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">TS Edge Nest</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          {/* 404 graphic */}
          <div className="relative mb-8 select-none">
            <span className="text-[9rem] font-black leading-none tracking-tighter text-border">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <Cloud className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2">Page not found</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            {isAuthenticated
              ? " Head back to the dashboard to continue."
              : " Go back to the home page to get started."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go back
            </Button>
            <Button asChild>
              <Link href={isAuthenticated ? "/dashboard" : "/"}>
                <Home className="mr-2 h-4 w-4" />
                {isAuthenticated ? "Dashboard" : "Home"}
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-muted-foreground text-xs">
        <p>TS Edge Nest &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
