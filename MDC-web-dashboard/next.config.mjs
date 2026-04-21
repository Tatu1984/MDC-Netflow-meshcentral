/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker deployment
  eslint: {
    // Ignore ESLint during builds - lint separately in CI
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during builds - check separately in CI
    ignoreBuildErrors: true,
  },
  // Prevent Next.js from redirecting /api/* paths with trailing slash normalization
  skipTrailingSlashRedirect: true,
  trailingSlash: false,
  // Security headers are now handled by middleware.ts
  // These are additional headers for static assets
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // Disable caching for HTML pages to ensure fresh content (not API routes)
        source: '/((?!api/|_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  // MDC API proxy is handled by /api/proxy/[...path] route handler
  // (Next.js rewrites can't handle the MDC self-signed SSL cert)
  // Optimize for production
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true,
};

export default nextConfig;
