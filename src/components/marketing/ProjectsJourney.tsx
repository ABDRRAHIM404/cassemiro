"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

export type HomepageProject = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  category: string | null;
  hero_image: string | null;
};

function projectOffset(index: number, active: number, count: number) {
  if (count === 2) return index === active ? 0 : 1;
  const offset = index - active;
  return offset > count / 2 ? offset - count : offset < -count / 2 ? offset + count : offset;
}

export function ProjectsJourney({ items }: { items: HomepageProject[] }) {
  const projects = items.filter((item): item is HomepageProject & { hero_image: string } => Boolean(item.hero_image));
  const [active, setActive] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const project = projects[active];
  const canRotate = projects.length > 1;

  function select(index: number) {
    if (canRotate) setActive((index + projects.length) % projects.length);
  }

  function resetDrag() {
    pointerStart.current = null;
    stageRef.current?.style.setProperty("--drag-x", "0px");
    stageRef.current?.classList.remove("is-dragging");
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canRotate || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(dy)) return;
    stageRef.current?.classList.add("is-dragging");
    stageRef.current?.style.setProperty("--drag-x", `${Math.max(-110, Math.min(110, dx * .35))}px`);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    resetDrag();
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.1) return;
    suppressClick.current = true;
    select(active + (dx < 0 ? 1 : -1));
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  }

  if (!project) {
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
    <section id="projetos" className="projects-journey" aria-labelledby="projects-title">
      <header className="shell projects-journey__header">
        <div><p className="eyebrow">Projetos selecionados</p><h2 id="projects-title">Obras que<br /><em>permanecem.</em></h2></div>
        <div className="projects-journey__meter" aria-label={`Projeto ${active + 1} de ${projects.length}`}>
          <span>{String(active + 1).padStart(2, "0")}</span><i><b style={{ transform: `scaleX(${(active + 1) / projects.length})` }} /></i><span>{String(projects.length).padStart(2, "0")}</span>
        </div>
      </header>

      <div className="projects-journey__catalogue">
        <div
          ref={stageRef}
          className="projects-journey__stage"
          tabIndex={canRotate ? 0 : undefined}
          aria-label="Catálogo de projetos. Use as setas para navegar."
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") { event.preventDefault(); select(active + 1); }
            if (event.key === "ArrowLeft") { event.preventDefault(); select(active - 1); }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetDrag}
          onDragStart={(event) => event.preventDefault()}
        >
          {projects.map((item, index) => {
            const offset = projectOffset(index, active, projects.length);
            const isActive = offset === 0;
            const isVisible = Math.abs(offset) <= 1;
            return (
              <Link
                href={`/projetos/${item.slug}`}
                key={item.id}
                className={`projects-journey__slide${isActive ? " is-active" : ""}`}
                style={{ "--slide-shift": `${offset * 100}%` } as CSSProperties}
                tabIndex={isVisible ? 0 : -1}
                aria-label={isActive ? `Ver projeto ${item.title}` : `Selecionar projeto ${item.title}`}
                aria-hidden={!isVisible}
                onClick={(event) => {
                  if (suppressClick.current) { event.preventDefault(); return; }
                  if (!isActive) { event.preventDefault(); select(index); }
                }}
                onPointerMove={(event) => {
                  if (!isActive || event.pointerType !== "mouse") return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  event.currentTarget.style.setProperty("--image-x", `${((event.clientX - bounds.left) / bounds.width - .5) * -14}px`);
                  event.currentTarget.style.setProperty("--image-y", `${((event.clientY - bounds.top) / bounds.height - .5) * -14}px`);
                }}
                onPointerLeave={(event) => {
                  event.currentTarget.style.setProperty("--image-x", "0px");
                  event.currentTarget.style.setProperty("--image-y", "0px");
                }}
              >
                <span className="projects-journey__image">
                  <Image src={item.hero_image} alt={item.title} fill sizes="(max-width: 700px) 88vw, (max-width: 1100px) 76vw, 1060px" unoptimized={item.hero_image.startsWith("/api/project-media/")} draggable={false} />
                  <span className="projects-journey__image-index">{String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span>
                </span>
              </Link>
            );
          })}
        </div>
        {canRotate && <>
          <button type="button" className="projects-journey__arrow projects-journey__arrow--prev" onClick={() => select(active - 1)} aria-label="Projeto anterior"><span aria-hidden="true">←</span></button>
          <button type="button" className="projects-journey__arrow projects-journey__arrow--next" onClick={() => select(active + 1)} aria-label="Próximo projeto"><span aria-hidden="true">→</span></button>
        </>}
      </div>

      <div className="shell projects-journey__footer">
        <div className="projects-journey__caption" aria-live="polite" aria-atomic="true">
          <span>{String(active + 1).padStart(2, "0")}</span>
          <div><h3>{project.title}</h3><p>{[project.category, project.city].filter(Boolean).join(" · ") || "Projeto CASSEMIRO"}</p></div>
        </div>
        <Link className="projects-journey__view" href={`/projetos/${project.slug}`}>Ver projeto <span aria-hidden="true">↗</span></Link>
      </div>
      {canRotate && <p className="shell projects-journey__hint">Arraste para explorar <span aria-hidden="true">—</span> ou use as setas</p>}
    </section>
  );
}
