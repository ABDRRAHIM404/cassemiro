import type { Metadata } from "next";
import { QuoteForm } from "@/components/marketing/QuoteForm";
import { createPublicClient } from "@/lib/supabase/public";
import { parseBusinessSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Solicitar orçamento",
  description: "Fale com a CASSEMIRO sobre sua construção ou reforma em Sorocaba e região."
};

export default async function ContactPage() {
  const supabase = createPublicClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const settings = parseBusinessSettings(data ?? []);
  return (
    <main id="conteudo" className="inner-page">
      <section className="inner-hero">
        <div className="shell">
          <p className="eyebrow">Seu projeto começa com uma conversa</p>
          <h1>Solicite um<br /><em>orçamento.</em></h1>
          <p>Conte-nos o que você planeja. A CASSEMIRO atende {settings.serviceAreas.join(", ")} e região.</p>
        </div>
      </section>
      <section className="quote-section section-pad">
        <div className="shell quote-section__grid">
          <div>
            <p className="eyebrow eyebrow--dark">Informações do projeto</p>
            <h2>Vamos entender<br />a sua <em>obra.</em></h2>
            <p>Preencha os dados ao lado para iniciar o atendimento. Se preferir, ligue diretamente para <a href={`tel:+${settings.phoneE164}`}>{settings.phoneDisplay}</a>.</p>
          </div>
          <QuoteForm whatsappPhone={settings.phoneE164} />
        </div>
      </section>
    </main>
  );
}
