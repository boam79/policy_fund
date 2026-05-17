import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./lib/security/contentSecurityPolicy";

// VERCEL_PROJECT_PRODUCTION_URL: stable production host (no protocol)
// VERCEL_URL: per-deployment preview host — SEO canonical에는 사용하지 않음
function resolvePublicOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit && !/localhost|127\.0\.0\.1/i.test(explicit)) {
    return explicit.replace(/\/$/, "")
  }

  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (prodHost) return `https://${prodHost}`

  if (process.env.VERCEL) return "https://policyfund-zeta.vercel.app"

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl && !/localhost|127\.0\.0\.1/i.test(appUrl)) {
    return appUrl.replace(/\/$/, "")
  }

  return "http://localhost:3000"
}

const productionUrl = resolvePublicOrigin()

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
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? productionUrl,
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
