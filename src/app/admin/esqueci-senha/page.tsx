import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/admin/AuthShell";
import { AuthSubmit } from "@/components/admin/AuthSubmit";
import styles from "@/components/admin/AuthShell.module.css";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Recuperar senha" };

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell>
          <span className={styles.restricted}>Acesso restrito</span>
          <h2>Recuperar senha</h2>
          <p className={styles.intro}>Informe seu e-mail administrativo. Enviaremos um link para escolher uma nova senha.</p>
          {params.error && <div className={styles.alert} role="alert">{params.error}</div>}
          {params.sent === "1" && <div className={`${styles.alert} ${styles.success}`} role="status">Se o e-mail tiver uma conta, você receberá um link de redefinição. Verifique também a pasta de spam.</div>}
          <form action={requestPasswordReset} className={styles.form}>
            <label htmlFor="recovery-email">E-mail</label>
            <input id="recovery-email" name="email" type="email" autoComplete="email" spellCheck={false} required />
            <AuthSubmit label="Enviar link de redefinição" pendingLabel="Enviando…" />
          </form>
          <Link href="/admin/login" className={styles.back}>← Voltar ao login</Link>
    </AuthShell>
  );
}
