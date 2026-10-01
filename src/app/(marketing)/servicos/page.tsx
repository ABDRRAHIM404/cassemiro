import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { TrackedLink } from "@/components/analytics/TrackedLink";

export const metadata: Metadata = {
  title: "Serviços de construção e reformas",
  description: "Construção residencial e comercial, reformas, estruturas, instalações e acabamentos em Sorocaba e região.",
  alternates: { canonical: "/servicos" }
};

export default async function ServicesPage() {
  const supabase = createPublicClient();
  const { data: services } = await supabase.from("services").select("id, slug, title, short_description, price_label, show_price").eq("is_visible", true).order("sort_order");

  return (
    <main id="conteudo" className="services-page">
      <section className="services-page__hero"><div className="shell"><p className="eyebrow">Do alicerce ao acabamento</p><h1>Uma equipe.<br /><em>Toda a obra.</em></h1><p>Experiência prática para coordenar estruturas, instalações e acabamentos com o mesmo compromisso.</p></div></section>
      <section className="services-page__list shell">
        {services?.map((service, index) => <TrackedLink href={`/servicos/${service.slug}`} eventName="service_opened" data={{ slug: service.slug }} className="service-public-card" key={service.id}>
          <span>{String(index + 1).padStart(2, "0")}</span><div><h2>{service.title}</h2><p>{service.short_description}</p>{service.show_price && service.price_label && <strong>{service.price_label}</strong>}</div><i>Explorar →</i>
        </TrackedLink>)}
      </section>
      <section className="services-page__cta"><div className="shell"><p className="eyebrow">Não encontrou exatamente o que procura?</p><h2>Conte o que<br />você precisa.</h2><Link className="button button--bronze" href="/contato">Conversar sobre a obra</Link></div></section>
    </main>
  );
}
