import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { createSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdmin>>;

export function quoteClientIdentity(forwardedFor: string | null): string | null {
  if (process.env.VERCEL !== "1") return process.env.NODE_ENV === "development" ? "local-development" : null;
  const ip = forwardedFor?.split(",")[0]?.trim();
  return ip && isIP(ip) ? ip : null;
}

export async function checkQuoteRateLimit(clientIdentity: string, supabase: AdminClient) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return { allowed: false, error: true };

  const keyHash = createHmac("sha256", secret).update(`quote:v1:${clientIdentity}`).digest("hex");
  const { data, error } = await supabase.rpc("consume_quote_rate_limit", {
    p_key_hash: keyHash,
    p_max_attempts: 5,
    p_window_seconds: 15 * 60
  });

  return { allowed: data === true, error: Boolean(error) };
}
