/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['mysql2', 'bcryptjs'],
};

export default nextConfig;
