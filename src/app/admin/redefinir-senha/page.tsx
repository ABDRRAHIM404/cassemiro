import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/admin/AuthShell";
import { AuthSubmit } from "@/components/admin/AuthSubmit";
import styles from "@/components/admin/AuthShell.module.css";
import { createClient } from "@/lib/supabase/server";
import { updateAdminPassword } from "../actions";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/admin/login?error=O+link+de+acesso+é+inválido+ou+expirou.");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  if (!profile) redirect("/admin/login?error=unauthorized");

  return (
    <AuthShell>
          <span className={styles.restricted}>Acesso restrito</span>
          <h2>Nova senha</h2>
          <p className={styles.intro}>Escolha uma senha de pelo menos 12 caracteres.</p>
          {params.error && <div className={styles.alert} role="alert">{params.error}</div>}
          <form action={updateAdminPassword} className={styles.form}>
            <label htmlFor="new-password">Nova senha</label>
            <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} required />
            <label htmlFor="confirm-password">Confirmar nova senha</label>
            <input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" minLength={12} required />
            <AuthSubmit label="Guardar nova senha" pendingLabel="Guardando…" />
          </form>
          <Link href="/admin/login" className={styles.back}>← Voltar ao login</Link>
    </AuthShell>
  );
}
