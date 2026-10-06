import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiNest = process.env.API_NEST_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        // Formulaires publics du pré-lancement : le navigateur n'appelle que
        // le même hôte, l'adresse interne de l'API reste côté serveur.
        source: '/api/marketing/:path*',
        destination: `${apiNest}/v1/marketing/:path*`,
      },
      {
        source: '/api/scanner/file/:id',
        destination: `${apiNest}/v1/scanner/documents/:id/file`,
      },
      {
        source: '/api/scanner/:path*',
        destination: `${apiNest}/v1/scanner/:path*`,
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
