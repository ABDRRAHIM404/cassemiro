import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { parseBusinessSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Política de privacidade",
  alternates: { canonical: "/politica-de-privacidade" },
  robots: { index: true, follow: true }
};

export default async function PrivacyPage() {
  const supabase = createPublicClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const settings = parseBusinessSettings(data ?? []);
  return (
    <main id="conteudo" className="legal-page">
      <div className="shell">
        <p className="eyebrow eyebrow--dark">Privacidade</p>
        <h1>Política de privacidade</h1>
        <p>Esta política explica como a CASSEMIRO utiliza as informações fornecidas por pessoas que entram em contato pelo site.</p>
        <h2>Dados enviados</h2><p>Podemos receber nome, telefone, cidade, tipo de obra, descrição do projeto e data desejada para início. Esses dados são utilizados somente para responder à solicitação e conduzir o atendimento comercial.</p>
        <h2>Compartilhamento e retenção</h2><p>Não vendemos dados pessoais. As informações podem ser processadas por serviços essenciais de hospedagem, banco de dados, e-mail e atendimento, sempre para operar o site e responder ao contato.</p>
        <h2>Métricas e erros técnicos</h2><p>Utilizamos métricas agregadas e sem cookies para compreender o uso das páginas públicas. Falhas técnicas podem ser registradas para diagnóstico, sem envio intencional dos dados preenchidos no formulário. As rotas administrativas não participam das métricas públicas.</p>
        <h2>Seus direitos</h2><p>Para solicitar acesso, correção ou exclusão dos seus dados, entre em contato pelo e-mail <a href={`mailto:${settings.email}`}>{settings.email}</a>.</p>
        <p className="legal-page__update">Última atualização: 26 de setembro de 2026.</p>
      </div>
    </main>
  );
}
