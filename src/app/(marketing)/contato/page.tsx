import type { Metadata } from "next";
import { socialMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/marketing/QuoteForm";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { parseBusinessSettings } from "@/lib/site-settings";
import { Phone } from "@phosphor-icons/react/dist/ssr/Phone";
import common from "@/components/marketing/PublicPage.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Solicitar orçamento",
  description: "Fale com a CASSEMIRO sobre sua construção ou reforma em Sorocaba e região.",
  alternates: { canonical: "/contato" },
  ...socialMetadata("Solicitar orçamento", "Fale com a CASSEMIRO sobre sua construção ou reforma em Sorocaba e região.")
};

export default async function ContactPage() {
  const supabase = createPublicClient();
  const data = requirePublicData(await supabase.from("site_settings").select("key, value"), "contact settings");
  const settings = parseBusinessSettings(data ?? []);
  return (
    <main id="conteudo" className={common.root}>
      <section className={`${common.shell} ${styles.composition}`} aria-labelledby="quote-title">
          <div className={styles.introduction}>
            <p className={common.context}>Seu projeto começa com uma conversa</p>
            <h1 id="quote-title" className={common.title}>Solicite um orçamento.</h1>
            <p className={common.intro}>Conte-nos o que você planeja. A CASSEMIRO atende {settings.serviceAreas.join(", ")} e região.</p>
            <div className={styles.help}>
              <p className={common.context}>Informações do projeto</p>
              <h2 className={common.sectionHeading}>Vamos entender a sua obra.</h2>
              <p>Preencha os dados para iniciar o atendimento. Se preferir, ligue diretamente para <a href={`tel:+${settings.phoneE164}`}>{settings.phoneDisplay}</a>.</p>
            </div>
            <a href={`tel:+${settings.phoneE164}`} className={styles.phone}><Phone size={22} weight="thin" aria-hidden="true" />{settings.phoneDisplay}</a>
          </div>
          <QuoteForm whatsappPhone={settings.phoneE164} />
      </section>
    </main>
  );
}
