/** @type {import('next').NextConfig} */
// Rewrites are baked at `next build` (standalone). Docker: INTERNAL_API_URL=http://backend:5000
const apiProxyTarget = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5010'
).replace(/\/$/, '');

const nextConfig = {
  experimental: {
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
  output: 'standalone',
};

module.exports = nextConfig;
