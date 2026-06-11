/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Vercel par typescript errors ignore karega
    ignoreBuildErrors: true,
  },
  eslint: {
    // Vercel par eslint errors ignore karega
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
