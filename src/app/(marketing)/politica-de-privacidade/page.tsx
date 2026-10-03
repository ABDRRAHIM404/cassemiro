import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { parseBusinessSettings } from "@/lib/site-settings";
import common from "@/components/marketing/PublicPage.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Política de privacidade",
  alternates: { canonical: "/politica-de-privacidade" },
  robots: { index: true, follow: true }
};

export default async function PrivacyPage() {
  const supabase = createPublicClient();
  const data = requirePublicData(await supabase.from("site_settings").select("key, value"), "privacy settings");
  const settings = parseBusinessSettings(data ?? []);
  return (
    <main id="conteudo" className={common.root}>
      <div className={`${common.shell} ${styles.layout}`}>
        <nav aria-label="Nesta política" className={styles.contents}>
          <p className={common.context}>Nesta página</p>
          <a href="#dados">Dados enviados</a>
          <a href="#retencao">Compartilhamento e retenção</a>
          <a href="#metricas">Métricas e erros técnicos</a>
          <a href="#direitos">Seus direitos</a>
        </nav>
        <article className={styles.article}>
        <header className={common.header}>
        <p className={common.context}>Privacidade</p>
        <h1 className={common.title}>Política de privacidade</h1>
        <p className={common.intro}>Esta política explica como a CASSEMIRO utiliza as informações fornecidas por pessoas que entram em contato pelo site.</p>
        </header>
        <section id="dados"><h2>Dados enviados</h2><p>Podemos receber nome, telefone, cidade, tipo de obra, descrição do projeto e data desejada para início. Esses dados são utilizados somente para responder à solicitação e conduzir o atendimento comercial.</p></section>
        <section id="retencao"><h2>Compartilhamento e retenção</h2><p>Não vendemos dados pessoais. As informações podem ser processadas por serviços essenciais de hospedagem, banco de dados, e-mail e atendimento, sempre para operar o site e responder ao contato. Após 12 meses sem contato registrado, uma rotina diária remove os dados de identificação e a descrição livre do pedido de orçamento; permanecem apenas o mês da solicitação, a categoria do serviço e o status para estatísticas anônimas.</p></section>
        <section id="metricas"><h2>Métricas e erros técnicos</h2><p>Utilizamos métricas agregadas e sem cookies para compreender o uso das páginas públicas. Falhas técnicas podem ser registradas para diagnóstico, sem envio intencional dos dados preenchidos no formulário. As rotas administrativas não participam das métricas públicas.</p></section>
        <section id="direitos"><h2>Seus direitos</h2><p>Para solicitar acesso, correção ou exclusão dos seus dados, entre em contato pelo e-mail <a href={`mailto:${settings.email}`}>{settings.email}</a>.</p>
        </section>
        <p className={styles.update}>Última atualização: 3 de outubro de 2026.</p>
        </article>
      </div>
    </main>
  );
}
