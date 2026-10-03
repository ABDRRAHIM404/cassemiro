import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export function createPublicClient(options?: { noStore?: boolean }) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, {
          ...init,
          ...(options?.noStore ? { cache: "no-store" as const } : { next: { revalidate: 300 } })
        })
      }
    }
  );
}
