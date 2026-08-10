import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sharp resolves its Linux binary and libvips dynamically. Include both in
  // the upload route trace so the production function has its native runtime
  // assets after Vercel packages the deployment.
  outputFileTracingIncludes: {
    "/api/trips/[tripId]/photos": [
      "node_modules/sharp/**/*",
      "node_modules/@img/sharp-linux-x64/**/*",
      "node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
  typedRoutes: true,
};

export default nextConfig;
