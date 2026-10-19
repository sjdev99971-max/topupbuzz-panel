/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://160.236.58.192:8000/:path*',
      },
    ]
  },
};
export default nextConfig;
