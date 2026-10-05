import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authOrigin, safeAdminDestination } from "@/lib/auth/redirects";

function privateRedirect(destination: URL) {
  return NextResponse.redirect(destination, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer"
    }
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeAdminDestination(url.searchParams.get("next"));

  // Also supports SSR token-hash templates, including opening email on another
  // device where the original PKCE verifier cookie is unavailable.
  if (tokenHash && (type === "email" || type === "recovery" || type === "invite" || type === "signup" || type === "magiclink" || type === "email_change")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return privateRedirect(new URL(type === "recovery" ? "/admin/redefinir-senha" : next, authOrigin()));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return privateRedirect(new URL(next, authOrigin()));
  }

  return privateRedirect(
    new URL("/admin/login?error=O+link+de+acesso+é+inválido+ou+expirou.", authOrigin())
  );
}
