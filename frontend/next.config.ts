import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ||
  "https://20.204.20.32.sslip.io";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy every /api/* call to the Express backend.
        // This means NEXT_PUBLIC_API_URL can simply be set to the Vercel
        // domain itself (e.g. https://leadhunterclub.vercel.app/api) and
        // Next.js will transparently forward the requests to the real server.
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
