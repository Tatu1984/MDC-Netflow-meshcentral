// MDC API (www.microdatacluster.com) uses a self-signed SSL certificate.
// Set this before anything else so the Next.js rewrite proxy can connect.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('./server.js');
