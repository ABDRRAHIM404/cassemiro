import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ProjectPhoto } from "@/components/marketing/ProjectPhoto";
import { getVerifiedProjectContext } from "@/lib/project-photo-context";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import common from "@/components/marketing/PublicPage.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Serviços de construção e reformas",
  description: "Construção residencial e comercial, reformas, estruturas, instalações e acabamentos em Sorocaba e região.",
  alternates: { canonical: "/servicos" }
};

export default async function ServicesPage() {
  const supabase = createPublicClient();
  const [servicesResult, photoResult] = await Promise.all([
    supabase.from("services").select("id, slug, title, short_description, price_label, show_price").eq("is_visible", true).order("sort_order"),
    supabase.from("projects").select("slug, title, hero_image").eq("is_published", true).not("hero_image", "is", null).order("created_at", { ascending: false }).limit(1)
  ]);
  const services = requirePublicData(servicesResult, "services index");
  const photo = requirePublicData(photoResult, "services project photo")?.[0];
  const context = photo ? getVerifiedProjectContext(photo.slug, photo.hero_image) : null;

  return (
    <main id="conteudo" className={common.root}>
      <section className={`${common.shell} ${styles.opening}`} aria-labelledby="services-title">
        <div><p className={common.context}>Do alicerce ao acabamento</p><h1 id="services-title" className={common.title}>Uma equipe.<br />Toda a obra.</h1><p className={common.intro}>Experiência prática para coordenar estruturas, instalações e acabamentos com o mesmo compromisso.</p></div>
        {photo && <figure className={styles.figure}><ProjectPhoto src={photo.hero_image} alt={context?.photo?.alt ?? photo.title} sizes="(max-width: 760px) calc(100vw - 40px), 52vw" preload /><figcaption>{context?.photo?.caption ?? photo.title}</figcaption></figure>}
      </section>
      <section className={`${common.shell} ${styles.services}`} aria-label="Serviços disponíveis">
        {services?.map((service, index) => <TrackedLink href={`/servicos/${service.slug}`} eventName="service_opened" data={{ slug: service.slug }} className={styles.service} key={service.id}>
          <span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h2>{service.title}</h2><div><p>{service.short_description}</p>{service.show_price && service.price_label && <strong>{service.price_label}</strong>}</div><ArrowRight size={24} weight="thin" aria-hidden="true" />
        </TrackedLink>)}
        {!services?.length && <p className={common.empty}>Os serviços serão publicados aqui. Entre em contato para conversar sobre a sua obra.</p>}
      </section>
      <section className={`${common.shell} ${common.compactCta}`}><div><p className={common.context}>Não encontrou exatamente o que procura?</p><h2>Conte o que você precisa.</h2></div><Link className={common.inlineAction} href="/contato">Conversar sobre a obra <ArrowRight size={20} weight="thin" aria-hidden="true" /></Link></section>
    </main>
  );
}
