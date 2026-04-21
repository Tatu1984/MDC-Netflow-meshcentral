/**
 * Runtime environment configuration.
 *
 * All config is fetched from /api/config at runtime so the Docker image
 * never has environment-specific values baked into the JS bundle.
 *
 * Usage (client components / browser libs):
 *   import { getEnv } from '@/lib/env';
 *   const { mdcApiUrl } = await getEnv();
 *
 * Usage (server-side — route handlers, Server Components):
 *   import { serverEnv } from '@/lib/env';
 *   const url = serverEnv.mdcApiUrl;
 */

export interface AppEnv {
  mdcApiUrl: string;
  bridgeApiUrl: string;
  apiUrl: string;
  entraClientId: string;
  entraTenantId: string;
  entraAuthority: string;
  entraRedirectUri: string;
  mdcScope: string;
  mdcDevApiKey: string;
  adminAppUrl: string;
  environment: string;
  buildTag: string;
}

// ─── Client-side (browser) ────────────────────────────────────────────────────

let configPromise: Promise<AppEnv> | null = null;

/**
 * Fetch runtime config from the server. The promise is cached so the
 * /api/config endpoint is only called once per page load.
 */
export function getEnv(): Promise<AppEnv> {
  if (typeof window === 'undefined') {
    // On the server just resolve immediately from process.env
    return Promise.resolve(serverEnv);
  }
  if (!configPromise) {
    configPromise = fetch('/api/config', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
        return res.json() as Promise<AppEnv>;
      })
      .catch((err) => {
        // Reset so the next caller retries
        configPromise = null;
        throw err;
      });
  }
  return configPromise;
}

/** Synchronous accessor — only valid after getEnv() has resolved once. */
let _resolved: AppEnv | null = null;
export function getCachedEnv(): AppEnv | null {
  return _resolved;
}

/** Call once at app boot (e.g. in a top-level layout) to pre-warm the cache. */
export async function initEnv(): Promise<AppEnv> {
  _resolved = await getEnv();
  return _resolved;
}

// ─── Server-side ──────────────────────────────────────────────────────────────

/**
 * Direct process.env access for server-side code (route handlers, middleware).
 * Never imported by client bundles.
 */
export const serverEnv: AppEnv = {
  mdcApiUrl: process.env.MDC_API_URL || 'https://microdatacluster.com',
  bridgeApiUrl: process.env.BRIDGE_API_URL || 'https://microdatacluster.com',
  apiUrl: process.env.API_URL || 'https://microdatacluster.com',
  entraClientId: process.env.ENTRA_CLIENT_ID || '',
  entraTenantId: process.env.ENTRA_TENANT_ID || '',
  entraAuthority: process.env.ENTRA_AUTHORITY || '',
  entraRedirectUri: process.env.ENTRA_REDIRECT_URI || '',
  mdcScope: process.env.MDC_SCOPE || '',
  mdcDevApiKey: process.env.MDC_DEV_API_KEY || '',
  adminAppUrl: process.env.ADMIN_APP_URL || '',
  environment: process.env.ENVIRONMENT || '',
  buildTag: process.env.BUILD_TAG || '',
};
