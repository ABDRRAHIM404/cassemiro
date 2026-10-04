import { isIP } from "node:net";

export function platformQuoteIdentity(
  headers: Headers,
  environment: { vercel?: string; nodeEnv?: string },
): string | null {
  if (environment.vercel !== "1") return environment.nodeEnv === "development" ? "local-development" : null;
  // Vercel supplies this header at its edge. Do not fall back to visitor-supplied
  // forwarding headers or select the first value of an ambiguous address chain.
  // https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
  const ip = headers.get("x-vercel-forwarded-for")?.trim();
  const version = ip ? isIP(ip) : 0;
  if (!ip || !version || ip.includes("%")) return null;
  // Equivalent IPv6 spellings share one limiter identity; no raw IP is stored.
  return version === 6 ? new URL(`http://[${ip}]/`).hostname.slice(1, -1) : ip;
}
