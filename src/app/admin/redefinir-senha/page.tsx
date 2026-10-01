import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
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
          <h2>Nova senha</h2>
          <p className="admin-login__intro">Escolha uma senha de pelo menos 12 caracteres.</p>
          {params.error && <div className="admin-alert" role="alert">{params.error}</div>}
          <form action={updateAdminPassword} className="admin-login__form">
            <label htmlFor="new-password">Nova senha</label>
            <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} required />
            <label htmlFor="confirm-password">Confirmar nova senha</label>
            <input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" minLength={12} required />
            <button className="button button--bronze" type="submit">Guardar nova senha</button>
          </form>
          <Link href="/admin/login" className="admin-login__back">← Voltar ao login</Link>
        </div>
      </div>
    </main>
  );
}
