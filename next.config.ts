import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // Stripe scripts and iframes
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      // Styles and fonts for Stripe UI and Google Fonts
      "style-src 'self' 'unsafe-inline' https://*.stripe.com https://fonts.googleapis.com",
      "font-src 'self' data: https://*.stripe.com https://fonts.gstatic.com",
      // Images used by Stripe elements
      "img-src 'self' data: blob: https://*.stripe.com",
      // XHR/WebSocket endpoints used by Stripe and Stack Auth
      "connect-src 'self' https://api.stripe.com https://m.stripe.com https://m.stripe.network https://js.stripe.com https://api.stack-auth.com https://app.stack-auth.com https://1.1.1.1",
      // Lock down who can frame us
      "frame-ancestors 'self'",
      // Workers if needed for dev tools
      "worker-src 'self' blob:",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // Ensure tsconfig paths alias works in all environments
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY:
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY,
  },
};

export default nextConfig;
