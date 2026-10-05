import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { adminContentSecurityPolicy } from "@/lib/security/admin-csp";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
  const policy = adminContentSecurityPolicy(nonce);
  // Overwrite caller-supplied values; Next reads this policy to nonce its scripts.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", policy);
  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"]
};
