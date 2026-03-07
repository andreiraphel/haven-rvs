/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for optimized Docker builds
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com"
      }
    ]
  },
};

export default nextConfig;
