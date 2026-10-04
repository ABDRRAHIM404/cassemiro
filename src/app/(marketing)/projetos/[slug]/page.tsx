import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { socialMetadata, titleWithSingleBrand } from "@/lib/seo";
import { getVerifiedProjectContext } from "@/lib/project-photo-context";
import { getVisibleServicesForProject } from "@/lib/public-project-links";
import { ProjectPhoto } from "@/components/marketing/ProjectPhoto";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import common from "@/components/marketing/PublicPage.module.css";
import styles from "./page.module.css";

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
    ...socialMetadata(title, description, project.hero_image ? {
      url: project.hero_image,
      alt: getVerifiedProjectContext(project.slug, project.hero_image)?.photo?.alt ?? `Registro do projeto ${project.title}`
    } : undefined)
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
    <main id="conteudo" className={common.root}>
      <section className={`${common.shell} ${common.header}`} aria-labelledby="project-title">
        <Link href="/projetos" className={common.back}><ArrowLeft size={18} weight="thin" aria-hidden="true" />Todos os projetos</Link>
        <p className={common.context}>{[project.category, project.city].filter(Boolean).join(" · ") || "Projeto CASSEMIRO"}</p><h1 id="project-title" className={common.title}>{project.title}</h1>
        {verifiedContext && <p className={styles.status}>{verifiedContext.status}</p>}
      </section>
      <figure className={styles.cover}><ProjectPhoto src={project.hero_image} alt={verifiedContext?.photo?.alt ?? project.title} className={styles.coverPhoto} sizes="100vw" preload />{verifiedContext?.photo && <figcaption className={common.shell}>{verifiedContext.photo.caption}</figcaption>}</figure>
      <section className={`${common.shell} ${styles.introduction}`} aria-labelledby="project-introduction">
        <div><h2 id="project-introduction" className={common.sectionHeading}>O projeto</h2><div className={common.prose}><p>{project.summary}</p></div></div>
        <dl>{project.city && <div><dt>Local</dt><dd>{project.city}</dd></div>}{project.duration && <div><dt>Duração</dt><dd>{project.duration}</dd></div>}{services.length > 0 && <div><dt>Serviços</dt><dd>{services.join(" · ")}</dd></div>}</dl>
      </section>
      {project.content && <section className={`${common.shell} ${common.prose} ${styles.story}`} aria-label="Sobre a obra"><p>{project.content}</p></section>}
      {comparisonGroups.length > 0 && <section className={`${common.shell} ${styles.comparisons}`} aria-label="Antes e depois da obra">
        {comparisonGroups.map((group) => <div className={styles.comparison} data-complete={Boolean(group.before && group.after)} key={group.name}>
          {group.before && <figure><ProjectPhoto src={group.before.url} alt={group.before.alt_text || `${project.title} antes`} sizes="(max-width: 760px) calc(100vw - 40px), 45vw" /><figcaption>Antes</figcaption></figure>}
          {group.after && <figure><ProjectPhoto src={group.after.url} alt={group.after.alt_text || `${project.title} depois`} sizes="(max-width: 760px) calc(100vw - 40px), 45vw" /><figcaption>Depois</figcaption></figure>}
        </div>)}
      </section>}
      {galleryMedia.length > 0 && <section className={`${common.shell} ${styles.gallery}`} aria-label="Registros do projeto">
        {galleryMedia.map((item, index) => <figure key={item.id}>
          {item.type === "video" ? <video src={item.url} controls preload="metadata" /> : <ProjectPhoto src={item.url} alt={item.alt_text || project.title} className={index === 0 ? styles.widePhoto : undefined} sizes={index === 0 ? "(max-width: 1300px) calc(100vw - 40px), 1160px" : "(max-width: 760px) calc(100vw - 40px), 45vw"} />}
          {item.alt_text && <figcaption>{item.alt_text}</figcaption>}
        </figure>)}
      </section>}
      {project.video_url && <section className={`${common.shell} ${styles.videoLink}`}><a className={common.inlineAction} href={project.video_url} target="_blank" rel="noreferrer">Assistir ao vídeo <ArrowUpRight size={20} weight="thin" aria-hidden="true" /></a></section>}
      <section className={`${common.shell} ${common.compactCta}`}><div><p className={common.context}>Seu projeto</p><h2>Vamos construir o próximo?</h2></div><Link className={common.inlineAction} href="/contato">Solicitar orçamento <ArrowRight size={20} weight="thin" aria-hidden="true" /></Link></section>
    </main>
  );
}
