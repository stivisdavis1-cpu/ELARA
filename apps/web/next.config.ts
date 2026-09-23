import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiNest = process.env.API_NEST_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/scanner/file/:id',
        destination: `${apiNest}/v1/scanner/documents/:id/file`,
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
