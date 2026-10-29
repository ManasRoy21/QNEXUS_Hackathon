/** Local same-origin API; Docker overrides API_PROXY_URL with its backend host. */
module.exports = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${process.env.API_PROXY_URL || 'http://127.0.0.1:8000'}/api/v1/:path*` }];
  },
};
