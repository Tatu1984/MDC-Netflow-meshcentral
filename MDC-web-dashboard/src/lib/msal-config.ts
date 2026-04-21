import { Configuration, LogLevel, PublicClientApplication } from '@azure/msal-browser';
import { getEnv } from './env';

// ─── Async config builder ─────────────────────────────────────────────────────
// All values come from the runtime /api/config endpoint — nothing is baked into
// the bundle at build time, so the same Docker image works for all environments.

function buildMsalConfig(env: Awaited<ReturnType<typeof getEnv>>): Configuration {
  const getAuthority = () => {
    if (env.entraAuthority) {
      return env.entraAuthority.replace(/\/$/, '');
    }
    return `https://login.microsoftonline.com/${env.entraTenantId || 'common'}`;
  };

  // Extract the known authority hostname for CIAM tenants
  const knownAuthorities: string[] = [];
  const authority = env.entraAuthority || '';
  if (authority) {
    try {
      knownAuthorities.push(new URL(authority).hostname);
    } catch {
      // ignore malformed URL
    }
  }

  return {
    auth: {
      clientId: env.entraClientId,
      authority: getAuthority(),
      redirectUri: env.entraRedirectUri || (typeof window !== 'undefined' ? window.location.origin : ''),
      postLogoutRedirectUri: '/',
      navigateToLoginRequestUrl: true,
      knownAuthorities,
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
              if (process.env.NODE_ENV === 'development') {
                console.info(message);
              }
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

// ─── Scopes ───────────────────────────────────────────────────────────────────

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
  prompt: 'select_account' as const,
};

/** Returns MDC API scopes using runtime config. */
export async function getMdcApiRequest() {
  const env = await getEnv();
  return {
    scopes: [env.mdcScope || ''],
  };
}

// Keep a synchronous export for code that already has a resolved env
// (populated after getMsalInstance() resolves).
export let mdcApiRequest = { scopes: [''] };

// ─── MSAL instance ────────────────────────────────────────────────────────────

let msalInstance: PublicClientApplication | null = null;
let msalInitPromise: Promise<PublicClientApplication | null> | null = null;

/**
 * Returns an initialised MSAL instance, or null if not in a browser or Entra
 * ID is not configured. The first call fetches runtime config; subsequent calls
 * return the cached instance.
 */
export async function getMsalInstance(): Promise<PublicClientApplication | null> {
  if (typeof window === 'undefined') return null;

  if (msalInstance) return msalInstance;

  if (!msalInitPromise) {
    msalInitPromise = getEnv().then(async (env) => {
      if (!env.entraClientId || !env.entraTenantId) return null;

      // Populate the synchronous mdcApiRequest for callers that use it
      mdcApiRequest = { scopes: [env.mdcScope || ''] };

      const config = buildMsalConfig(env);
      const instance = new PublicClientApplication(config);
      await instance.initialize();
      msalInstance = instance;
      return msalInstance;
    }).catch(() => {
      msalInitPromise = null;
      return null;
    });
  }

  return msalInitPromise;
}

/** Check if Entra ID is configured (async — reads runtime config). */
export async function isEntraIDConfigured(): Promise<boolean> {
  const env = await getEnv();
  return !!(env.entraClientId && env.entraTenantId);
}
