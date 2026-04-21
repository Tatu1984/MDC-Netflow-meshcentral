'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AccountInfo, PublicClientApplication } from '@azure/msal-browser';
import {
  fetchRuntimeConfig,
  buildMsalConfig,
  setMsalInstance,
  setMdcApiUrl,
  setMdcScope,
  getMsalInstance,
  loginRequest,
  isEntraIDConfigured,
  RuntimeConfig,
} from '@/lib/msal-config';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

interface MicrosoftAuthState {
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  isInitialized: boolean;
}

export function useMicrosoftAuth() {
  const router = useRouter();
  const { login } = useAuthStore();
  const initializingRef = useRef(false);
  const [state, setState] = useState<MicrosoftAuthState>({
    isLoading: false,
    error: null,
    isConfigured: false,
    isInitialized: false,
  });

  // Process account info from Microsoft and create admin session
  const processAccountInfo = useCallback((account: AccountInfo) => {
    const user = {
      id: account.localAccountId || account.homeAccountId,
      email: account.username,
      name: account.name || account.username,
      role: 'admin' as const,
      organizationId: 'org-' + account.tenantId,
      entraIdOid: account.localAccountId,
      authProvider: 'entra_id' as const,
      createdAt: new Date().toISOString(),
    };

    const organization = {
      id: 'org-' + account.tenantId,
      name: account.name ? `${account.name}'s Organization` : 'My Organization',
      slug: 'my-org',
      plan: 'professional' as const,
      createdAt: new Date().toISOString(),
    };

    login(user, organization);
    router.push('/admin');

    return { user, organization };
  }, [login, router]);

  // Initialize MSAL on mount — fetch runtime config first, then create instance
  useEffect(() => {
    const initializeMsal = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;

      let config: RuntimeConfig;
      try {
        config = await fetchRuntimeConfig();
      } catch (error) {
        console.error('Failed to fetch runtime config:', error);
        setState(prev => ({ ...prev, isConfigured: false, isInitialized: true }));
        return;
      }

      if (!isEntraIDConfigured(config)) {
        setState(prev => ({ ...prev, isConfigured: false, isInitialized: true }));
        return;
      }

      // Store MDC API URL and scope from runtime config (no NEXT_PUBLIC_ needed)
      setMdcApiUrl(config.mdcApiUrl);
      setMdcScope(config.mdcScope);

      try {
        const instance = new PublicClientApplication(buildMsalConfig(config));
        setMsalInstance(instance);

        await instance.initialize();

        // Handle any pending redirect after login
        const response = await instance.handleRedirectPromise();
        if (response?.account) {
          processAccountInfo(response.account);
        }

        setState(prev => ({ ...prev, isConfigured: true, isInitialized: true }));
      } catch (error) {
        console.error('MSAL initialization error:', error);
        setState(prev => ({ ...prev, isConfigured: false, isInitialized: true }));
      }
    };

    initializeMsal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithMicrosoft = useCallback(async () => {
    const msalInstance = getMsalInstance();

    if (!msalInstance) {
      setState(prev => ({ ...prev, error: 'Microsoft authentication is not configured' }));
      return;
    }

    if (!state.isInitialized) {
      setState(prev => ({ ...prev, error: 'Authentication is initializing. Please try again.' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await msalInstance.loginPopup(loginRequest);

      if (response.account) {
        processAccountInfo(response.account);
      }
    } catch (error: unknown) {
      console.error('Microsoft login error:', error);

      let errorMessage = 'Failed to sign in with Microsoft';

      if (error instanceof Error) {
        if (error.message.includes('interaction_in_progress')) {
          errorMessage = 'Please close any open login windows and try again.';
          try {
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length === 0) {
              sessionStorage.clear();
            }
          } catch {
            // Ignore cleanup errors
          }
        } else if (error.message.includes('user_cancelled')) {
          errorMessage = 'Sign in was cancelled.';
        } else if (error.message.includes('popup_window_error')) {
          errorMessage = 'Popup was blocked. Please allow popups for this site.';
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isInitialized, processAccountInfo]);

  return {
    signInWithMicrosoft,
    isLoading: state.isLoading,
    error: state.error,
    isConfigured: state.isConfigured,
    isInitialized: state.isInitialized,
    clearError: () => setState(prev => ({ ...prev, error: null })),
  };
}
