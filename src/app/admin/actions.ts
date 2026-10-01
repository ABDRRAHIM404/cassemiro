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

const passwordResetSchema = z.object({ email: z.email() });
const newPasswordSchema = z.object({
  password: z.string().min(12).max(200),
  confirm_password: z.string()
}).refine((value) => value.password === value.confirm_password);

function safeAdminDestination(next?: string) {
  return next?.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

function loginRedirect(message: string, next?: string): never {
  const params = new URLSearchParams({ error: message });
  if (next?.startsWith("/admin") && !next.startsWith("//")) params.set("next", next);
  redirect(`/admin/login?${params.toString()}`);
}

async function authOrigin() {
  const requestHeaders = await headers();
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return configuredOrigin ?? (host ? `${protocol}://${host}` : "http://localhost:3000");
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

  const origin = await authOrigin();
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

export async function requestPasswordReset(formData: FormData) {
  const parsed = passwordResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/admin/esqueci-senha?error=Digite+um+e-mail+válido.");

  const origin = await authOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/admin/redefinir-senha")}`
  });

  if (error) redirect("/admin/esqueci-senha?error=Não+foi+possível+enviar+o+link+agora.+Tente+mais+tarde.");
  redirect("/admin/esqueci-senha?sent=1");
}

export async function updateAdminPassword(formData: FormData) {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password")
  });
  if (!parsed.success) redirect("/admin/redefinir-senha?error=Use+uma+senha+de+12+ou+mais+caracteres+e+confirme-a.");

  const supabase = await createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) redirect("/admin/login?error=O+link+de+acesso+é+inválido+ou+expirou.");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userResult.user.id).maybeSingle();
  if (!profile) redirect("/admin/login?error=unauthorized");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect("/admin/redefinir-senha?error=Não+foi+possível+alterar+a+senha.+Tente+outra+senha.");

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/admin/login?reset=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/admin/login");
}
