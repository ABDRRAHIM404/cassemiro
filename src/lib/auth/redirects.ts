export const PRODUCTION_ORIGIN = "https://cassemiro-one.vercel.app";

// Deployed auth always uses the canonical site, even with a stale environment
// value or a spoofed forwarded host. Local redirects are development-only.
export function authOrigin() {
  if (process.env.NODE_ENV !== "development") return PRODUCTION_ORIGIN;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return url.origin;
  } catch { /* Invalid development setting: fall back to the local app. */ }
  return "http://localhost:3000";
}

export function safeAdminDestination(value?: string | null) {
  if (!value?.startsWith("/") || /[\\\u0000-\u001f\u007f]/u.test(value)) return "/admin";
  try {
    const url = new URL(value, PRODUCTION_ORIGIN);
    if (url.origin !== PRODUCTION_ORIGIN || /%(?:2f|5c|25)/iu.test(url.pathname)) return "/admin";
    if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/admin"; }
}

export function authCallbackUrl(next?: string) {
  const url = new URL("/auth/callback", authOrigin());
  url.searchParams.set("next", safeAdminDestination(next));
  return url.href;
}
