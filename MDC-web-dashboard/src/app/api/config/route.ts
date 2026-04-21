import { NextResponse } from 'next/server';

/**
 * Runtime configuration endpoint.
 *
 * Environment variables are read here at request time — not at build time.
 * This means the Docker image is environment-agnostic: the same image works
 * for dev, UAT, and production just by injecting different env vars.
 *
 * Variables must NOT have the NEXT_PUBLIC_ prefix so Next.js does NOT
 * embed them in the client bundle at build time.
 */
export const dynamic = 'force-dynamic'; // never cache this response

export async function GET() {
  const config = {
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

  return NextResponse.json(config, {
    headers: {
      // Prevent browsers and CDNs from caching this response
      'Cache-Control': 'no-store',
    },
  });
}
