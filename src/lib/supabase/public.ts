import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 300 } })
      }
    }
  );
}
