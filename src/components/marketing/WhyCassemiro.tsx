"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { Timer } from "@phosphor-icons/react/dist/csr/Timer";
import { HardHat } from "@phosphor-icons/react/dist/csr/HardHat";
import { Handshake } from "@phosphor-icons/react/dist/csr/Handshake";
import { Reveal } from "@/components/motion/Reveal";
import styles from "./WhyCassemiro.module.css";

const pillars = [
  { title: "Qualidade", text: "Cuidado técnico, inclusive no que não se vê.", Icon: ShieldCheck },
  { title: "Prazos", text: "Planejamento claro em cada etapa da obra.", Icon: Timer },
  { title: "Experiência", text: "Mais de quatro décadas orientando cada decisão.", Icon: HardHat },
  { title: "Confiança", text: "Presença e responsabilidade do início ao fim.", Icon: Handshake },
] as const;

export function WhyCassemiro({ imageUrl }: { imageUrl?: string | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)");
    let frame = 0;
    let lastScrollChoice = -1;
    let visible = false;
    const update = () => {
      frame = 0;
      if (!visible || reducedMotion.matches) return;
      const rect = section.getBoundingClientRect();
      const header = window.innerWidth <= 1000 ? 64 : 72;
      // The mobile stage also leaves room for the fixed contact bar. Measure
      // its actual height so all four phases finish before the section exits.
      const distance = Math.max(1, rect.height - (stageRef.current?.getBoundingClientRect().height ?? window.innerHeight - header));
      const progress = Math.min(1, Math.max(0, (header - rect.top) / distance));
      const choice = Math.min(pillars.length - 1, Math.floor(progress * pillars.length));
      section.style.setProperty("--trust-progress", String(progress));
      // Only discrete phase changes enter React. Hover/focus remains selected
      // until scrolling actually reaches another phase.
      if (choice !== lastScrollChoice) {
        lastScrollChoice = choice;
        setActive(choice);
      }
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestUpdate();
    });
    observer.observe(section);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    reducedMotion.addEventListener("change", requestUpdate);
    mobile.addEventListener("change", requestUpdate);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
      mobile.removeEventListener("change", requestUpdate);
    };
  }, []);

  return (
    <section id="porque" ref={sectionRef} className={styles.root} aria-labelledby="why-title">
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.media} aria-hidden="true">
          <Image src={imageUrl || "/media/hero/frames-webp/frame_100.webp"} alt="" fill sizes="100vw" unoptimized={Boolean(imageUrl?.startsWith("/api/project-media/"))} />
        </div>
        <div className={styles.scrim} aria-hidden="true" />
        <div className={styles.datum} aria-hidden="true" />
        <div className={styles.composition}>
          <Reveal className={styles.heading}>
            <h2 id="why-title">Por que escolher<br />a CASSEMIRO?</h2>
            <p>Mais que construir, assumir cada detalhe como nosso.</p>
          </Reveal>
          <div className={styles.feature}>
            {pillars.map(({ title, text, Icon }, index) => (
              <div id={`trust-feature-${index}`} className={styles.featureItem} aria-hidden={active !== index} key={title}>
                <Icon size={42} weight="thin" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className={styles.controls} role="group" aria-label="Compromissos CASSEMIRO" onKeyDown={(event) => {
            let next: number;
            if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (active + 1) % pillars.length;
            else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (active - 1 + pillars.length) % pillars.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = pillars.length - 1;
            else return;
            event.preventDefault();
            controlsRef.current[next]?.focus();
          }}>
            {pillars.map((pillar, index) => (
              <button ref={(node) => { controlsRef.current[index] = node; }} type="button" aria-pressed={active === index} aria-controls={`trust-feature-${index}`} onPointerEnter={(event) => { if (event.pointerType === "mouse") setActive(index); }} onFocus={() => setActive(index)} onClick={() => setActive(index)} key={pillar.title}>
                <span className={styles.number} aria-hidden="true">0{index + 1}</span>
                <span>{pillar.title}</span>
              </button>
            ))}
          </div>
          <p className={styles.footnote}><span>O que sustenta cada projeto.</span> Uma obra feita para durar começa com a forma de trabalhar.</p>
          <p className={styles.announcement} role="status" aria-live="polite">{pillars[active].title}: {pillars[active].text}</p>
        </div>
      </div>
    </section>
  );
}
