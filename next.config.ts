import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

function sentryIngestOrigin() {
  try {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return null;
    const origin = new URL(dsn);
    return origin.protocol === "https:" ? origin.origin : null;
  } catch {
    return null;
  }
}

const sentryOrigin = sentryIngestOrigin();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{
      protocol: "https",
      hostname: "zjjepitczgffszbilfte.supabase.co",
      pathname: "/storage/v1/object/public/project-media/**"
    }]
  },
  async headers() {
    return [
      {
        // Admin CSP comes from the request-specific proxy, not a static header.
        source: "/((?!admin(?:/|$)).*)",
        headers: [
          { key: "Content-Security-Policy", value: [
            "default-src 'self'",
            `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://zjjepitczgffszbilfte.supabase.co",
            `connect-src 'self' https://zjjepitczgffszbilfte.supabase.co${sentryOrigin ? ` ${sentryOrigin}` : ""}`,
            "media-src 'self' blob: https://zjjepitczgffszbilfte.supabase.co",
            "font-src 'self' data:",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'self'",
            "form-action 'self'"
          ].join("; ") },
        ]
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" }
        ]
      },
      {
        source: "/auth/callback",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" }
        ]
      }
    ];
  }
};

const canUploadSentrySourceMaps = Boolean(
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN
);

export default canUploadSentrySourceMaps
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI
    })
  : nextConfig;
