import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/admin/AuthShell";
import { AuthSubmit } from "@/components/admin/AuthSubmit";
import styles from "@/components/admin/AuthShell.module.css";
import { createClient } from "@/lib/supabase/server";
import { login, logout, sendMagicLink } from "../actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string; sent?: string; reset?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (userId && params.error !== "unauthorized") {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (profile) redirect("/admin");
  }

  return (
    <AuthShell>
          <span className={styles.restricted}>Acesso restrito</span>
          <h2>Entrar</h2>
          {params.error && (
            <div className={styles.alert} role="alert">
              {params.error === "unauthorized" ? "Esta conta não possui um perfil administrativo." : params.error}
            </div>
          )}
          {params.sent === "1" && (
            <div className={`${styles.alert} ${styles.success}`} role="status">
              Se o e-mail estiver autorizado, você receberá um link de acesso. Verifique também a pasta de spam.
            </div>
          )}
          {params.reset === "1" && (
            <div className={`${styles.alert} ${styles.success}`} role="status">Senha alterada. Entre com a sua nova senha.</div>
          )}
          {userId && params.error === "unauthorized" ? (
            <form action={logout}>
              <AuthSubmit label="Sair desta conta" pendingLabel="Saindo…" />
            </form>
          ) : (
            <form action={login} className={styles.form}>
              <input type="hidden" name="next" value={params.next ?? ""} />
              <label htmlFor="admin-email">E-mail</label>
              <input id="admin-email" name="email" type="email" autoComplete="email" spellCheck={false} required />
              <label htmlFor="admin-password">Senha</label>
              <input id="admin-password" name="password" type="password" autoComplete="current-password" minLength={8} required />
              <AuthSubmit label="Acessar painel" pendingLabel="Entrando…" />
            </form>
          )}
          {!userId && <Link href="/admin/esqueci-senha" className={styles.utility}>Esqueceu a senha?</Link>}
          {!userId && (
            <>
              <div className={styles.divider}><span>ou</span></div>
              <form action={sendMagicLink} className={styles.form}>
                <input type="hidden" name="next" value={params.next ?? ""} />
                <label htmlFor="admin-magic-email">Entrar sem senha</label>
                <input id="admin-magic-email" name="email" type="email" autoComplete="email" spellCheck={false} placeholder="seu@email.com" required />
                <AuthSubmit label="Enviar link de acesso" pendingLabel="Enviando…" secondary />
              </form>
            </>
          )}
          <Link href="/" className={styles.back}>← Voltar ao site</Link>
    </AuthShell>
  );
}
