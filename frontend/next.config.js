/** Local same-origin API; Docker overrides API_PROXY_URL with its backend host. */
module.exports = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  async rewrites() {
    // Vercel Services routes API traffic directly to the Python service.
    // A cloud deployment must never proxy to the visitor's/local build's localhost.
    if (process.env.VERCEL && !process.env.API_PROXY_URL) return [];
    return [{ source: '/api/v1/:path*', destination: `${process.env.API_PROXY_URL || 'http://127.0.0.1:8000'}/api/v1/:path*` }];
  },
};
