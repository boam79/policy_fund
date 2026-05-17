import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./lib/security/contentSecurityPolicy";

// VERCEL_PROJECT_PRODUCTION_URL: stable production URL (no protocol prefix)
// VERCEL_URL: per-deployment URL (no protocol prefix)
const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? productionUrl,
  },
  async headers() {
    const h = [...securityHeaders]
    if (process.env.VERCEL) {
      h.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" })
    }
    return [{ source: "/:path*", headers: h }];
  },
};

export default nextConfig;
