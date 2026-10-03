import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ProjectPhoto } from "@/components/marketing/ProjectPhoto";
import { getVerifiedProjectContext } from "@/lib/project-photo-context";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import common from "@/components/marketing/PublicPage.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Projetos realizados",
  description: "Conheça obras e reformas realizadas pela CASSEMIRO em Sorocaba e região.",
  alternates: { canonical: "/projetos" }
};

export default async function ProjectsPage() {
  const supabase = createPublicClient();
  const projectsResult = await supabase.from("projects")
    .select("id, slug, title, city, category, summary, hero_image")
    .eq("is_published", true).order("created_at", { ascending: false });
  const projects = requirePublicData(projectsResult, "projects index");

  return (
    <main id="conteudo" className={common.root}>
      <section className={`${common.shell} ${common.header}`} aria-labelledby="archive-title">
        <p className={common.context}>Obras realizadas</p><h1 id="archive-title" className={common.title}>Projetos que permanecem.</h1><p className={common.intro}>Construções e transformações conduzidas com experiência, responsabilidade e atenção ao detalhe.</p>
      </section>
      <section className={`${common.shell} ${styles.records}`} aria-label="Projetos publicados">
        {projects?.map((project, index) => {
          const context = getVerifiedProjectContext(project.slug, project.hero_image);
          return <TrackedLink className={styles.record} href={`/projetos/${project.slug}`} eventName="project_opened" data={{ slug: project.slug }} key={project.id}>
            <ProjectPhoto src={project.hero_image} alt={context?.photo?.alt ?? project.title} className={styles.photo} preload={index === 0} sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1300px) calc(100vw - 144px), 1000px" />
            <div className={styles.caption}><div><p className={styles.meta}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{[project.category, project.city].filter(Boolean).join(" · ")}</p><h2>{project.title}</h2><p className={styles.summary}>{project.summary}</p>{context && <p className={styles.note}>{context.status}{context.photo && ` · ${context.photo.caption}`}</p>}</div><span className={common.inlineAction}>Ver projeto <ArrowRight size={20} weight="thin" aria-hidden="true" /></span></div>
          </TrackedLink>;
        })}
        {!projects?.length && <p className={common.empty}>Os primeiros registros serão publicados aqui assim que a seleção de imagens reais estiver concluída.</p>}
      </section>
    </main>
  );
}
