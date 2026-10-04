import "server-only";

import { createHmac } from "node:crypto";
import { platformQuoteIdentity } from "@/lib/quotes/platform-identity";
import type { createSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdmin>>;

export function quoteClientIdentity(headers: Headers): string | null {
  return platformQuoteIdentity(headers, { vercel: process.env.VERCEL, nodeEnv: process.env.NODE_ENV });
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
