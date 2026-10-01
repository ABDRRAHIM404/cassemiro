import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Recuperar senha" };

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;

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
          <h2>Recuperar senha</h2>
          <p className="admin-login__intro">Informe seu e-mail administrativo. Enviaremos um link para escolher uma nova senha.</p>
          {params.error && <div className="admin-alert" role="alert">{params.error}</div>}
          {params.sent === "1" && <div className="admin-alert admin-alert--success" role="status">Se o e-mail tiver uma conta, você receberá um link de redefinição. Verifique também a pasta de spam.</div>}
          <form action={requestPasswordReset} className="admin-login__form">
            <label htmlFor="recovery-email">E-mail</label>
            <input id="recovery-email" name="email" type="email" autoComplete="email" required />
            <button className="button button--bronze" type="submit">Enviar link de redefinição</button>
          </form>
          <Link href="/admin/login" className="admin-login__back">← Voltar ao login</Link>
        </div>
      </div>
    </main>
  );
}
