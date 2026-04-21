import { NextResponse } from 'next/server';

// Force dynamic rendering so this route always runs at request time,
// reading live env vars from Azure App Service — never statically cached.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    entraClientId: process.env.ENTRA_CLIENT_ID || '',
    entraTenantId: process.env.ENTRA_TENANT_ID || '',
    entraAuthority: process.env.ENTRA_AUTHORITY || '',
    entraRedirectUri: process.env.ENTRA_REDIRECT_URI || '',
    mdcApiUrl: process.env.MDC_API_URL || '',
    mdcScope: process.env.MDC_SCOPE || '',
  });
}
