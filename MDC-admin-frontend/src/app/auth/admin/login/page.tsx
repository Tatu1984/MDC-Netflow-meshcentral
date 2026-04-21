'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2 } from 'lucide-react';
import { useMicrosoftAuth } from '@/hooks/use-microsoft-auth';

// Microsoft icon component
const MicrosoftIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
  </svg>
);

export default function AdminLoginPage() {
  const [error, setError] = useState('');

  const {
    signInWithMicrosoft,
    isLoading: microsoftLoading,
    error: microsoftError,
    isConfigured: isMicrosoftConfigured,
    isInitialized: isMicrosoftInitialized,
    clearError: clearMicrosoftError,
  } = useMicrosoftAuth();

  useEffect(() => {
    if (microsoftError) {
      setError(microsoftError);
    }
  }, [microsoftError]);

  const handleMicrosoftLogin = async () => {
    setError('');
    clearMicrosoftError();
    await signInWithMicrosoft();
  };

  return (
    <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-red-500" />
        </div>
        <CardTitle className="text-white text-2xl">Admin Sign In</CardTitle>
        <CardDescription className="text-slate-400">
          Sign in with your Microsoft account to access the admin console
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isMicrosoftInitialized ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : !isMicrosoftConfigured ? (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-red-400">
              Microsoft authentication is not configured. Please contact your administrator.
            </AlertDescription>
          </Alert>
        ) : (
          <Button
            type="button"
            className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white border-0"
            onClick={handleMicrosoftLogin}
            disabled={microsoftLoading}
          >
            {microsoftLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MicrosoftIcon />
            )}
            <span className="ml-2">Sign in with Microsoft</span>
          </Button>
        )}

        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <div className="text-center text-sm text-slate-400">
          Admin access only
        </div>
      </CardFooter>
    </Card>
  );
}
