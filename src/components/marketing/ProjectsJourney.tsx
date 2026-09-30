"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type HomepageProject = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  category: string | null;
  hero_image: string | null;
};

export function ProjectsJourney({ items }: { items: HomepageProject[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const projects = items.filter((item) => item.hero_image);

  useEffect(() => {
    const section = sectionRef.current;
    const rail = railRef.current;
    if (!section || !rail || projects.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom <= 0 || rect.top >= viewportHeight) return;
      const distance = Math.max(1, section.offsetHeight - viewportHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      const travel = Math.max(0, rail.scrollWidth - window.innerWidth + 48);
      rail.style.transform = `translate3d(${-progress * travel}px, 0, 0)`;
      section.style.setProperty("--projects-progress", String(progress));
      section.querySelectorAll<HTMLElement>(".projects-journey__image").forEach((image, index) => {
        const itemProgress = Math.min(1, Math.max(0, progress * projects.length - index + 0.25));
        image.style.setProperty("--image-progress", String(itemProgress));
      });
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [projects.length]);

  if (!projects.length) {
    return (
      <section id="projetos" className="projects-empty" aria-labelledby="projects-title">
        <div className="shell projects-empty__grid">
          <div><p className="eyebrow">Projetos selecionados</p><h2 id="projects-title">Obras reais.<br /><em>Histórias em construção.</em></h2></div>
          <div className="projects-empty__note"><span>Acervo em preparação</span><p>Os primeiros registros serão publicados aqui assim que a seleção de imagens reais estiver concluída.</p></div>
        </div>
      </section>
    );
  }

  return (
    <section id="projetos" ref={sectionRef} className="projects-journey" aria-labelledby="projects-title">
      <div className="projects-journey__sticky">
        <header className="shell projects-journey__header">
          <div><p className="eyebrow">Projetos selecionados</p><h2 id="projects-title">Obras que<br /><em>permanecem.</em></h2></div>
          <div className="projects-journey__meter"><span>01</span><i><b /></i><span>{String(projects.length).padStart(2, "0")}</span></div>
        </header>
        <div ref={railRef} className="projects-journey__rail">
          {projects.map((project, index) => (
            <Link href={`/projetos/${project.slug}`} className="projects-journey__item" key={project.id}>
              <div className="projects-journey__image" role="img" aria-label={project.title} style={{ backgroundImage: `url(${project.hero_image})` }} />
              <div className="projects-journey__caption"><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{project.title}</h3><p>{[project.category, project.city].filter(Boolean).join(" · ")}</p></div><i>Ver projeto ↗</i></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
