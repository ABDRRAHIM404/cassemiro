import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { siteConfig } from "@/config/site";
import { serializeJsonLd } from "@/lib/json-ld";
import { parseBusinessSettings } from "@/lib/site-settings";
import { titleWithSingleBrand } from "@/lib/seo";
import { getPublishedProjectsForService } from "@/lib/public-project-links";

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
    alternates: { canonical: `/servicos/${service.slug}` }
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
    <main id="conteudo" className="service-detail">
      <section className="service-detail__hero"><div className="shell"><Link href="/servicos">← Todos os serviços</Link><p className="eyebrow">Construção & Reformas</p><h1>{service.title}</h1><p>{service.short_description}</p></div></section>
      <section className="service-detail__body shell"><div><span>COMO PODEMOS AJUDAR</span><p>{service.content}</p></div><aside>{service.show_price && service.price_label && <div><span>INVESTIMENTO</span><strong>{service.price_label}</strong></div>}<p>Cada obra é avaliada individualmente conforme escopo, materiais, local e prazo.</p><a className="button button--bronze" href={`https://wa.me/${business.phoneE164}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Pedir orçamento no WhatsApp</a></aside></section>
      {projects.length > 0 && <section className="service-projects shell"><p className="eyebrow eyebrow--dark">Projetos relacionados</p><div>{projects.map((project) => <Link href={`/projetos/${project.slug}`} key={project.slug}><span style={project.hero_image ? { backgroundImage: `url(${project.hero_image})` } : undefined} /><h2>{project.title}</h2><p>{project.city}</p></Link>)}</div></section>}
      <section className="service-detail__cta"><div className="shell"><h2>Seu projeto começa<br />com uma conversa.</h2><Link className="button button--bronze" href="/contato">Solicitar orçamento</Link></div></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    </main>
  );
}
