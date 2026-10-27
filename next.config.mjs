/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // yahoo-finance2 se usa solo en el servidor, sin empaquetar.
  experimental: { serverComponentsExternalPackages: ['yahoo-finance2'] },
  images: { remotePatterns: [{ protocol: 'https', hostname: 'img.logo.dev' }] }
};
export default nextConfig;
