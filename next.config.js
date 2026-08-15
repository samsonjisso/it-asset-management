/** @type {import('next').NextConfig} */
const API_URL = process.env.API_PROXY_TARGET || 'http://localhost:4000';

const nextConfig = {
  allowedDevOrigins: ['http://localhost:3000', 'http://localhost:4000', '192.168.12.15'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
