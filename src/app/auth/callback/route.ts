import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeAdminDestination(value: string | null) {
  return value?.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

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
  const next = safeAdminDestination(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return privateRedirect(new URL(next, url.origin));
  }

  return privateRedirect(
    new URL("/admin/login?error=O+link+de+acesso+é+inválido+ou+expirou.", url.origin)
  );
}
