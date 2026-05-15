import type { NextConfig } from "next";

// VERCEL_PROJECT_PRODUCTION_URL: stable production URL (no protocol prefix)
// VERCEL_URL: per-deployment URL (no protocol prefix)
const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? productionUrl,
  },
};

export default nextConfig;
