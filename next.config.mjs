/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Essential for the Docker build to find the standalone folder
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com"
      }
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
