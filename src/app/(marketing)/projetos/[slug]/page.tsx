/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { titleWithSingleBrand } from "@/lib/seo";
import { getVerifiedProjectContext } from "@/lib/project-photo-context";
import { getVisibleServicesForProject } from "@/lib/public-project-links";

type Props = { params: Promise<{ slug: string }> };

async function getProject(slug: string) {
  const supabase = createPublicClient();
  return requirePublicData(await supabase.from("projects").select("*").eq("slug", slug).eq("is_published", true).maybeSingle(), "project detail");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  const title = project.seo_title || project.title;
  const description = project.seo_description || project.summary;
  return {
    title: titleWithSingleBrand(title),
    description,
    alternates: { canonical: `/projetos/${project.slug}` },
    openGraph: { title, description, images: project.hero_image ? [project.hero_image] : undefined }
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const supabase = createPublicClient();
  const [mediaResult, services] = await Promise.all([
    supabase.from("project_media").select("*").eq("project_id", project.id).order("sort_order"),
    getVisibleServicesForProject(project.id)
  ]);
  const media = requirePublicData(mediaResult, "project media") ?? [];
  const galleryMedia = media.filter((item) => item.type !== "before" && item.type !== "after");
  const comparisonGroups = Array.from(new Set(media.filter((item) => item.type === "before" || item.type === "after").map((item) => item.before_after_group || "comparativo-1")))
    .map((name) => ({ name, before: media.find((item) => (item.before_after_group || "comparativo-1") === name && item.type === "before"), after: media.find((item) => (item.before_after_group || "comparativo-1") === name && item.type === "after") }))
    .filter((group) => group.before || group.after);
  const verifiedContext = getVerifiedProjectContext(project.slug, project.hero_image);

  return (
    <main id="conteudo" className="project-detail">
      <section className="project-detail__hero" style={project.hero_image ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.72)), url(${project.hero_image})` } : undefined}>
        <div className="shell"><Link href="/projetos">← Todos os projetos</Link><p>{[project.category, project.city, verifiedContext?.status, verifiedContext?.photo?.caption].filter(Boolean).join(" · ")}</p><h1>{project.title}</h1></div>
      </section>
      <section className="project-detail__intro shell">
        <div><span>O PROJETO</span><p>{project.summary}</p></div>
        <dl>{project.city && <div><dt>Local</dt><dd>{project.city}</dd></div>}{project.duration && <div><dt>Duração</dt><dd>{project.duration}</dd></div>}{services.length > 0 && <div><dt>Serviços</dt><dd>{services.join(" · ")}</dd></div>}</dl>
      </section>
      {project.content && <section className="project-detail__story shell"><p>{project.content}</p></section>}
      {comparisonGroups.length > 0 && <section className="project-comparisons shell">
        {comparisonGroups.map((group) => <div className="project-comparison" key={group.name}>
          {group.before && <figure><span>ANTES</span><img src={group.before.url} alt={group.before.alt_text || `${project.title} antes`} loading="lazy" /></figure>}
          {group.after && <figure><span>DEPOIS</span><img src={group.after.url} alt={group.after.alt_text || `${project.title} depois`} loading="lazy" /></figure>}
        </div>)}
      </section>}
      {galleryMedia.length > 0 && <section className="project-gallery shell">
        {galleryMedia.map((item) => <figure key={item.id} className={`project-gallery__item project-gallery__item--${item.type}`}>
          {item.type === "video" ? <video src={item.url} controls preload="metadata" /> : <img src={item.url} alt={item.alt_text || project.title} loading="lazy" />}
          {item.alt_text && <figcaption>{item.alt_text}</figcaption>}
        </figure>)}
      </section>}
      {project.video_url && <section className="project-detail__video shell"><a className="button button--bronze" href={project.video_url} target="_blank" rel="noreferrer">Assistir ao vídeo ↗</a></section>}
      <section className="project-detail__cta"><div className="shell"><p className="eyebrow">Seu projeto</p><h2>Vamos construir<br />o próximo?</h2><Link className="button button--bronze" href="/contato">Solicitar orçamento</Link></div></section>
    </main>
  );
}
