import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/server";
import { login, logout, sendMagicLink } from "../actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string; sent?: string }>;
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
    <main id="conteudo" className="admin-login">
      <div className="admin-login__brand">
        <Link href="/" aria-label="Voltar ao site"><Logo /></Link>
        <div>
          <p className="eyebrow">Área administrativa</p>
          <h1>A obra por trás<br />do <em>site.</em></h1>
          <p>Gerencie solicitações, serviços, projetos e conteúdo da CASSEMIRO.</p>
        </div>
      </div>
      <div className="admin-login__panel">
        <div className="admin-login__form-wrap">
          <span>ACESSO RESTRITO</span>
          <h2>Entrar</h2>
          {params.error && (
            <div className="admin-alert" role="alert">
              {params.error === "unauthorized" ? "Esta conta não possui um perfil administrativo." : params.error}
            </div>
          )}
          {params.sent === "1" && (
            <div className="admin-alert admin-alert--success" role="status">
              Se o e-mail estiver autorizado, você receberá um link de acesso. Verifique também a pasta de spam.
            </div>
          )}
          {userId && params.error === "unauthorized" ? (
            <form action={logout}>
              <button className="button button--bronze" type="submit">Sair desta conta</button>
            </form>
          ) : (
            <form action={login} className="admin-login__form">
              <input type="hidden" name="next" value={params.next ?? ""} />
              <label htmlFor="admin-email">E-mail</label>
              <input id="admin-email" name="email" type="email" autoComplete="email" required />
              <label htmlFor="admin-password">Senha</label>
              <input id="admin-password" name="password" type="password" autoComplete="current-password" minLength={8} required />
              <button className="button button--bronze" type="submit">Acessar painel</button>
            </form>
          )}
          {!userId && (
            <>
              <div className="admin-login__divider"><span>ou</span></div>
              <form action={sendMagicLink} className="admin-login__form">
                <input type="hidden" name="next" value={params.next ?? ""} />
                <label htmlFor="admin-magic-email">Entrar sem senha</label>
                <input id="admin-magic-email" name="email" type="email" autoComplete="email" placeholder="seu@email.com" required />
                <button className="button admin-login__magic-button" type="submit">Enviar link de acesso</button>
              </form>
            </>
          )}
          <Link href="/" className="admin-login__back">← Voltar ao site</Link>
        </div>
      </div>
    </main>
  );
}
