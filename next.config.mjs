/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ye ESLint errors ko bypass karega
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ye TypeScript ke strict errors ko bypass karega
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
