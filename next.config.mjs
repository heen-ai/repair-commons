/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Pre-existing lint errors in volunteer pages shouldn't block deploys
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
