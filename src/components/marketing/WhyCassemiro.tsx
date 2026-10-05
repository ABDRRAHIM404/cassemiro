"use client";

import Image from "next/image";
import { useRef, useState } from "react";
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
  const controlsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [active, setActive] = useState(0);

  return (
    <section id="porque" className={styles.root} aria-labelledby="why-title">
      <div className={styles.stage}>
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
