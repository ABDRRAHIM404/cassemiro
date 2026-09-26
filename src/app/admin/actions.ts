"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
  next: z.string().optional()
});

const magicLinkSchema = z.object({
  email: z.email(),
  next: z.string().optional()
});

function safeAdminDestination(next?: string) {
  return next?.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

function loginRedirect(message: string, next?: string): never {
  const params = new URLSearchParams({ error: message });
  if (next?.startsWith("/admin") && !next.startsWith("//")) params.set("next", next);
  redirect(`/admin/login?${params.toString()}`);
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined
  });

  if (!parsed.success) loginRedirect("Confira o e-mail e a senha.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error || !data.user) loginRedirect("E-mail ou senha inválidos.", parsed.data.next);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    loginRedirect("Esta conta não tem acesso administrativo.");
  }

  revalidatePath("/", "layout");
  redirect(safeAdminDestination(parsed.data.next));
}

export async function sendMagicLink(formData: FormData) {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined
  });

  if (!parsed.success) loginRedirect("Digite um e-mail válido.");

  const requestHeaders = await headers();
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = configuredOrigin ?? (host ? `${protocol}://${host}` : "http://localhost:3000");
  const next = safeAdminDestination(parsed.data.next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    }
  });

  const params = new URLSearchParams();
  if (parsed.data.next) params.set("next", next);

  // Do not reveal whether an address is registered as an administrator.
  if (error) params.set("error", "Não foi possível enviar o link agora. Tente novamente em alguns minutos.");
  else params.set("sent", "1");

  redirect(`/admin/login?${params.toString()}`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/admin/login");
}
