import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const MDC_BACKEND = process.env.MDC_API_URL || 'https://microdatacluster.com';
console.log('[MDC Proxy] Backend URL:', MDC_BACKEND);

// Agent that accepts self-signed certificates
const agent = new https.Agent({ rejectUnauthorized: false });

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, await req.text());
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, await req.text());
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, await req.text());
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}

async function proxy(req: NextRequest, pathSegments: string[], body?: string) {
  const path = '/' + pathSegments.join('/');
  const search = req.nextUrl.search; // includes '?'
  const url = `${MDC_BACKEND}${path}${search}`;

  const headers: Record<string, string> = {};
  // Forward relevant headers
  for (const key of ['content-type', 'accept', 'x-api-key', 'authorization']) {
    const val = req.headers.get(key);
    if (val) headers[key] = val;
  }

  // If the browser sent no auth at all, inject the server-side dev API key as fallback.
  // This covers the case where the user is not yet signed in via MSAL.
  if (!headers['authorization'] && !headers['x-api-key']) {
    const devKey = process.env.MDC_DEV_API_KEY;
    if (devKey) headers['x-api-key'] = devKey;
  }

  try {
    const { status, contentType, buffer } = await nodeFetch(url, {
      method: req.method,
      headers,
      body: body || undefined,
    });

    // 204 No Content — return empty response
    if (status === 204 || buffer.length === 0) {
      return new NextResponse(null, { status });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status,
      headers: {
        'content-type': contentType || 'application/json',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[MDC Proxy] Error proxying ${req.method} ${url}: ${message}`);
    return NextResponse.json(
      { error: 'Failed to connect to MDC backend', detail: message },
      { status: 502 },
    );
  }
}

// Custom fetch using Node.js https module to bypass self-signed cert
function nodeFetch(
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string }
): Promise<{ status: number; contentType: string; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: options.method,
      headers: options.headers,
      agent,
    };

    const req = https.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode || 500,
          contentType: (res.headers['content-type'] as string) || '',
          buffer: Buffer.concat(chunks),
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
