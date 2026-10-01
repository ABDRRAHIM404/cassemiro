import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { TrackedLink } from "@/components/analytics/TrackedLink";

export const metadata: Metadata = {
  title: "Projetos realizados",
  description: "Conheça obras e reformas realizadas pela CASSEMIRO em Sorocaba e região.",
  alternates: { canonical: "/projetos" }
};

export default async function ProjectsPage() {
  const supabase = createPublicClient();
  const { data: projects } = await supabase.from("projects")
    .select("id, slug, title, city, category, summary, hero_image")
    .eq("is_published", true).order("created_at", { ascending: false });

  return (
    <main id="conteudo" className="projects-page">
      <section className="projects-hero">
        <div className="shell"><p className="eyebrow">Obras realizadas</p><h1>Projetos que<br /><em>permanecem.</em></h1><p>Construções e transformações conduzidas com experiência, responsabilidade e atenção ao detalhe.</p></div>
      </section>
      <section className="projects-list shell" aria-label="Projetos publicados">
        {projects?.map((project, index) => (
          <TrackedLink className="project-card" href={`/projetos/${project.slug}`} eventName="project_opened" data={{ slug: project.slug }} key={project.id}>
            <div className="project-card__image" style={project.hero_image ? { backgroundImage: `url(${project.hero_image})` } : undefined}><span>{String(index + 1).padStart(2, "0")}</span></div>
            <div className="project-card__copy"><div><span>{[project.category, project.city].filter(Boolean).join(" · ")}</span><h2>{project.title}</h2></div><p>{project.summary}</p><i>Ver projeto →</i></div>
          </TrackedLink>
        ))}
      </section>
    </main>
  );
}
