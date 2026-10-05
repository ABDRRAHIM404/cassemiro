/** Admin-only script policy. Inline styles remain compatible with React styles. */
export function adminContentSecurityPolicy(nonce: string): string {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(nonce)) throw new Error("Invalid CSP nonce");
  let sentryOrigin = "";
  try {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn) {
      const parsed = new URL(dsn);
      if (parsed.protocol === "https:") sentryOrigin = ` ${parsed.origin}`;
    }
  } catch { /* Invalid optional monitoring configuration is not an allowlist. */ }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://zjjepitczgffszbilfte.supabase.co",
    `connect-src 'self' https://zjjepitczgffszbilfte.supabase.co${sentryOrigin}`,
    "media-src 'self' blob: https://zjjepitczgffszbilfte.supabase.co",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'"
  ].join("; ");
}
