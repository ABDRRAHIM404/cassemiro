"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ArrowUpRight } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { Reveal } from "@/components/motion/Reveal";
import { getVerifiedProjectContext } from "@/lib/project-photo-context";
import styles from "./ProjectsJourney.module.css";

export type HomepageProject = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  category: string | null;
  hero_image: string | null;
};

function projectOffset(index: number, active: number, count: number) {
  // With only two real photographs, leave one flank open instead of cloning
  // the other project just to manufacture a three-image catalogue.
  if (count === 2) return index === active ? 0 : 1;
  const offset = index - active;
  return offset > count / 2 ? offset - count : offset < -count / 2 ? offset + count : offset;
}

export function ProjectsJourney({ items }: { items: HomepageProject[] }) {
  const projects = items.filter((item): item is HomepageProject & { hero_image: string } => Boolean(item.hero_image));
  const [active, setActive] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const reducedMotion = useRef(false);
  const hoverFrame = useRef(0);
  const hoverPoint = useRef<{ element: HTMLElement; x: number; y: number } | null>(null);
  const project = projects[active];
  const canRotate = projects.length > 1;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotion.current = media.matches; };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      cancelAnimationFrame(hoverFrame.current);
    };
  }, []);

  function select(index: number) {
    if (canRotate) setActive((index + projects.length) % projects.length);
  }

  function rotate(direction: number) {
    if (canRotate) setActive(previous => (previous + direction + projects.length) % projects.length);
  }

  function resetDrag() {
    const pointer = pointerStart.current;
    const stage = stageRef.current;
    pointerStart.current = null;
    if (pointer && stage?.hasPointerCapture(pointer.id)) stage.releasePointerCapture(pointer.id);
    stage?.style.setProperty("--drag-x", "0px");
    if (stage) delete stage.dataset.dragging;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canRotate || (event.pointerType === "mouse" && event.button !== 0)) return;
    suppressClick.current = false;
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.dragging) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) { resetDrag(); return; }
      start.dragging = true;
      event.currentTarget.setPointerCapture(start.id);
      event.currentTarget.dataset.dragging = "true";
    }
    stageRef.current?.style.setProperty("--drag-x", `${Math.max(-120, Math.min(120, dx * .35))}px`);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    suppressClick.current = start.dragging;
    resetDrag();
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.1) rotate(dx < 0 ? 1 : -1);
  }

  function hover(event: PointerEvent<HTMLElement>, isActive: boolean) {
    if (!isActive || event.pointerType !== "mouse" || pointerStart.current?.dragging || reducedMotion.current) return;
    hoverPoint.current = { element: event.currentTarget, x: event.clientX, y: event.clientY };
    if (hoverFrame.current) return;
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = 0;
      const point = hoverPoint.current;
      if (!point?.element.isConnected) return;
      const bounds = point.element.getBoundingClientRect();
      point.element.style.setProperty("--image-x", `${((point.x - bounds.left) / bounds.width - .5) * -12}px`);
      point.element.style.setProperty("--image-y", `${((point.y - bounds.top) / bounds.height - .5) * -12}px`);
    });
  }

  function leave(event: PointerEvent<HTMLElement>) {
    hoverPoint.current = null;
    cancelAnimationFrame(hoverFrame.current);
    hoverFrame.current = 0;
    event.currentTarget.style.setProperty("--image-x", "0px");
    event.currentTarget.style.setProperty("--image-y", "0px");
  }

  if (!project) {
    return (
      <section id="projetos" className={styles.empty} aria-labelledby="projects-title">
        <div className={styles.shell}>
          <h2 id="projects-title">Obras que permanecem.</h2>
          <p>Obras reais. Histórias em construção.</p>
          <p className={styles.emptyNote}><span>Acervo em preparação</span> Os primeiros registros serão publicados aqui assim que a seleção de imagens reais estiver concluída.</p>
        </div>
      </section>
    );
  }
  const activeContext = getVerifiedProjectContext(project.slug, project.hero_image);

  return (
    <section id="projetos" className={styles.root} aria-labelledby="projects-title" aria-roledescription="carrossel">
      <noscript>
        <style>{`.${styles.root} .${styles.arrow}, .${styles.root} .${styles.hint} { display: none; }`}</style>
        <p className={styles.shell}><Link className={styles.view} href="/projetos">Explorar todos os projetos <ArrowUpRight size={18} weight="light" aria-hidden="true" /></Link></p>
      </noscript>
      <header className={`${styles.shell} ${styles.header}`}>
        <Reveal><p className={styles.context}>Projetos selecionados</p><h2 id="projects-title">Obras que permanecem.</h2></Reveal>
        <div className={styles.meter} role="group" aria-label={`Projeto ${active + 1} de ${projects.length}`}>
          <span>{String(active + 1).padStart(2, "0")}</span><span aria-hidden="true">/</span><span>{String(projects.length).padStart(2, "0")}</span>
          <i aria-hidden="true"><b style={{ transform: `scaleX(${(active + 1) / projects.length})` }} /></i>
        </div>
      </header>
      <div className={styles.catalogue}>
        <div ref={stageRef} className={styles.stage} role="group" tabIndex={canRotate ? 0 : undefined} aria-label="Use as setas para navegar pelos projetos" onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === "ArrowRight") { event.preventDefault(); rotate(1); }
          if (event.key === "ArrowLeft") { event.preventDefault(); rotate(-1); }
          if (event.key === "Home") { event.preventDefault(); select(0); }
          if (event.key === "End") { event.preventDefault(); select(projects.length - 1); }
        }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={resetDrag} onDragStart={(event) => event.preventDefault()}>
          {projects.map((item, index) => {
            const context = getVerifiedProjectContext(item.slug, item.hero_image);
            const offset = projectOffset(index, active, projects.length);
            const isActive = offset === 0;
            const isVisible = Math.abs(offset) <= 1;
            return (
              <article key={item.id} className={styles.slide} data-active={isActive} aria-hidden={!isVisible} inert={!isVisible} role="group" aria-roledescription="slide" aria-label={`${index + 1} de ${projects.length}`} style={{ "--slide-shift": `${offset * 100}%` } as CSSProperties} onPointerMove={(event) => hover(event, isActive)} onPointerLeave={leave}>
                <div className={styles.image}>
                  <Image src={item.hero_image} alt={context?.photo?.alt ?? item.title} fill sizes="(max-width: 760px) 88vw, (max-width: 1300px) 72vw, 960px" unoptimized={item.hero_image.startsWith("/api/project-media/")} draggable={false} />
                </div>
                {isActive ? <Link className={styles.hitArea} href={`/projetos/${item.slug}`} aria-label={`Ver projeto ${item.title}`} onClick={(event) => { if (suppressClick.current && event.detail !== 0) event.preventDefault(); }} /> : <button className={styles.hitArea} type="button" aria-label={`Selecionar projeto ${item.title}`} onClick={(event) => { if (!suppressClick.current || event.detail === 0) select(index); }} />}
              </article>
            );
          })}
        </div>
        {canRotate && <>
          <button type="button" className={`${styles.arrow} ${styles.previous}`} onClick={() => rotate(-1)} aria-label="Projeto anterior"><CaretLeft size={36} weight="thin" aria-hidden="true" /></button>
          <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => rotate(1)} aria-label="Próximo projeto"><CaretRight size={36} weight="thin" aria-hidden="true" /></button>
        </>}
      </div>
      <div className={styles.captionBand}>
        <div className={styles.caption} aria-live="polite" aria-atomic="true">
          <h3>{project.title}</h3>
          <p>{[project.category, project.city].filter(Boolean).join(" · ") || "Projeto CASSEMIRO"}</p>
          {activeContext && <p className={styles.photoNote}>{activeContext.status}{activeContext.photo && ` · ${activeContext.photo.caption}`}</p>}
        </div>
        <Link className={styles.view} href={`/projetos/${project.slug}`}>Ver projeto <ArrowUpRight size={18} weight="light" aria-hidden="true" /></Link>
      </div>
      {canRotate && <p className={styles.hint}>Arraste para explorar ou use as setas</p>}
    </section>
  );
}
