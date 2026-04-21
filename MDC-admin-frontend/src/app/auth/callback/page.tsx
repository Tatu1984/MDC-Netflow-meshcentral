'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // The MSAL redirect is handled by useMicrosoftAuth hook on initialization
    // This page just waits and redirects based on auth state
    const checkAuth = () => {
      if (isAuthenticated) {
        // Always redirect to admin in the admin app
        router.push('/admin');
      } else {
        // Not authenticated yet - wait a bit for MSAL to process
        setTimeout(() => {
          const store = useAuthStore.getState();
          if (!store.isAuthenticated) {
            router.push('/auth/admin/login');
          }
        }, 2000);
      }
    };

    checkAuth();
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-slate-300 text-lg">Completing authentication...</p>
          <p className="text-slate-500 text-sm mt-2">Please wait while we sign you in</p>
        </CardContent>
      </Card>
    </div>
  );
}
