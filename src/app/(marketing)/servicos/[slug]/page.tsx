import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { siteConfig } from "@/config/site";
import { serializeJsonLd } from "@/lib/json-ld";
import { parseBusinessSettings } from "@/lib/site-settings";
import { socialMetadata, titleWithSingleBrand } from "@/lib/seo";
import { getPublishedProjectsForService } from "@/lib/public-project-links";
import { getVerifiedProjectContext } from "@/lib/project-photo-context";
import { ProjectPhoto } from "@/components/marketing/ProjectPhoto";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import common from "@/components/marketing/PublicPage.module.css";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

async function getService(slug: string) {
  const supabase = createPublicClient();
  return requirePublicData(await supabase.from("services").select("*").eq("slug", slug).eq("is_visible", true).maybeSingle(), "service detail");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return {};
  return {
    title: titleWithSingleBrand(service.seo_title || service.title),
    description: service.seo_description || service.short_description,
    alternates: { canonical: `/servicos/${service.slug}` },
    ...socialMetadata(service.seo_title || service.title, service.seo_description || service.short_description)
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();
  const supabase = createPublicClient();
  const [projects, settingsResult] = await Promise.all([
    getPublishedProjectsForService(service.id),
    supabase.from("site_settings").select("key, value")
  ]);
  const settingsRows = requirePublicData(settingsResult, "service settings");
  const business = parseBusinessSettings(settingsRows ?? []);
  const message = `Olá, encontrei a CASSEMIRO pelo site e gostaria de solicitar um orçamento para ${service.title}.`;

  const structuredData = {
    "@context": "https://schema.org", "@type": "Service", name: service.title,
    description: service.short_description, provider: { "@type": "GeneralContractor", name: siteConfig.name },
    areaServed: business.serviceAreas.map((name) => ({ "@type": "City", name }))
  };

  return (
    <main id="conteudo" className={common.root}>
      <section className={`${common.shell} ${common.header}`} aria-labelledby="service-title">
        <Link href="/servicos" className={common.back}><ArrowLeft size={18} weight="thin" aria-hidden="true" />Todos os serviços</Link>
        <p className={common.context}>Construção & Reformas</p><h1 id="service-title" className={common.title}>{service.title}</h1><p className={common.intro}>{service.short_description}</p>
      </section>
      <section className={`${common.shell} ${styles.body}`} aria-labelledby="service-help">
        <div><h2 id="service-help" className={common.sectionHeading}>Como podemos ajudar</h2><div className={common.prose}>{String(service.content ?? "").split(/\n\s*\n/).filter(Boolean).map((text, index) => <p key={index}>{text}</p>)}</div></div>
        <aside className={styles.enquiry} aria-label="Solicitar orçamento para este serviço">
          {service.show_price && service.price_label && <div className={styles.price}><span>Investimento</span><strong>{service.price_label}</strong></div>}
          <p>Cada obra é avaliada individualmente conforme escopo, materiais, local e prazo.</p><a className={common.action} href={`https://wa.me/${business.phoneE164}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Pedir orçamento no WhatsApp <ArrowRight size={18} weight="thin" aria-hidden="true" /></a>
        </aside>
      </section>
      {projects.length > 0 && <section className={`${common.shell} ${styles.related}`} aria-labelledby="related-projects"><h2 id="related-projects" className={common.sectionHeading}>Projetos relacionados</h2>
        {projects.map((project) => {
          const context = getVerifiedProjectContext(project.slug, project.hero_image);
          return <Link className={styles.project} href={`/projetos/${project.slug}`} key={project.slug}><ProjectPhoto src={project.hero_image} alt={context?.photo?.alt ?? project.title} sizes="(max-width: 760px) calc(100vw - 40px), 75vw" /><div><h3>{project.title}</h3>{project.city && <p>{project.city}</p>}{context && <p className={styles.photoNote}>{context.status}{context.photo && ` · ${context.photo.caption}`}</p>}<span className={common.inlineAction}>Ver projeto <ArrowRight size={18} weight="thin" aria-hidden="true" /></span></div></Link>;
        })}
      </section>}
      <section className={`${common.shell} ${common.compactCta}`}><h2>Seu projeto começa com uma conversa.</h2><Link className={common.inlineAction} href="/contato">Solicitar orçamento <ArrowRight size={20} weight="thin" aria-hidden="true" /></Link></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    </main>
  );
}
