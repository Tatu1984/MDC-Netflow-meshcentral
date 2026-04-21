'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, ArrowLeft, Loader2 } from 'lucide-react';
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

export default function UserLoginPage() {
  const [error, setError] = useState('');

  const {
    signInWithMicrosoft,
    signUpWithMicrosoft,
    isLoading: microsoftLoading,
    error: microsoftError,
    isConfigured: isMicrosoftConfigured,
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

  const handleMicrosoftSignUp = async () => {
    setError('');
    clearMicrosoftError();
    await signUpWithMicrosoft();
  };

  return (
    <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-blue-500" />
        </div>
        <CardTitle className="text-white text-2xl">Welcome</CardTitle>
        <CardDescription className="text-slate-400">
          Sign in or create an account to access your cloud dashboard
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isMicrosoftConfigured ? (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-red-400">
              Microsoft authentication is not configured. Please contact your administrator.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Button
              type="button"
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
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

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
              onClick={handleMicrosoftSignUp}
              disabled={microsoftLoading}
            >
              {microsoftLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MicrosoftIcon />
              )}
              <span className="ml-2">Sign up with Microsoft</span>
            </Button>
          </>
        )}

        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <Link href="/" className="flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </CardFooter>
    </Card>
  );
}
