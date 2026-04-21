import { Configuration, LogLevel, PublicClientApplication } from '@azure/msal-browser';

// Runtime config shape — fetched from /api/config at startup
export interface RuntimeConfig {
  entraClientId: string;
  entraTenantId: string;
  entraAuthority: string;
  entraRedirectUri: string;
  mdcApiUrl: string;
  mdcScope: string;
}

// Fetch runtime config from the server-side API route.
// This allows Azure App Service Application Settings (plain env vars,
// no NEXT_PUBLIC_ prefix) to be used without baking values at build time.
export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to fetch runtime config');
  return res.json();
}

function buildAuthority(config: RuntimeConfig): string {
  if (config.entraAuthority) {
    const authority = config.entraAuthority.replace(/\/$/, '');
    return authority.endsWith('/v2.0') ? authority : `${authority}/v2.0`;
  }
  return `https://login.microsoftonline.com/${config.entraTenantId || 'common'}/v2.0`;
}

export function buildMsalConfig(config: RuntimeConfig): Configuration {
  return {
    auth: {
      clientId: config.entraClientId,
      authority: buildAuthority(config),
      redirectUri: config.entraRedirectUri || 'http://localhost:3001/auth/callback',
      postLogoutRedirectUri: '/',
      navigateToLoginRequestUrl: true,
      knownAuthorities: ['tensparrowsmicrodatacluster.ciamlogin.com'],
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          switch (level) {
            case LogLevel.Error:
              console.error(message);
              return;
            case LogLevel.Warning:
              console.warn(message);
              return;
            case LogLevel.Info:
              if (process.env.NODE_ENV === 'development') console.info(message);
              return;
            default:
              return;
          }
        },
        logLevel: process.env.NODE_ENV === 'development' ? LogLevel.Warning : LogLevel.Error,
      },
    },
  };
}

// Scopes for sign-in
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
  prompt: 'select_account' as const,
};

// Scopes for MDC API access — populated from runtime config via setMdcScope().
// Never hardcode a scope here: the scope must match the ENTRA_CLIENT_ID in use.
export let mdcApiRequest = { scopes: [''] };

export function setMdcScope(scope: string) {
  if (scope && scope.trim()) {
    mdcApiRequest = { scopes: [scope.trim()] };
  }
}

// MSAL instance and MDC API URL — set after runtime config is fetched
let msalInstance: PublicClientApplication | null = null;
let runtimeMdcApiUrl: string = '';

export function getMsalInstance(): PublicClientApplication | null {
  if (typeof window === 'undefined') return null;
  return msalInstance;
}

export function setMsalInstance(instance: PublicClientApplication) {
  msalInstance = instance;
}

export function getMdcApiUrl(): string {
  if (!runtimeMdcApiUrl) {
    throw new Error(
      'MDC API URL has not been set. Ensure setMdcApiUrl() is called with the MDC_API_URL from runtime config before making API requests.'
    );
  }
  return runtimeMdcApiUrl;
}

export function setMdcApiUrl(url: string) {
  if (url && url.trim()) {
    runtimeMdcApiUrl = url.trim().replace(/\/$/, ''); // strip trailing slash
  }
}

export function isEntraIDConfigured(config?: RuntimeConfig): boolean {
  if (config) {
    return !!(config.entraClientId && config.entraTenantId);
  }
  // Fallback: check if instance already exists
  return msalInstance !== null;
}
