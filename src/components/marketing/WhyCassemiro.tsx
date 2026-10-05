"use client";

import Image from "next/image";
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
          <ul className={styles.pillars} aria-label="Compromissos CASSEMIRO">
            {pillars.map(({ title, text, Icon }, index) => (
              <li className={styles.pillar} key={title}>
                <div className={styles.pillarMark}>
                  <Icon size={36} weight="thin" aria-hidden="true" />
                  <span className={styles.number} aria-hidden="true">0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
          <p className={styles.footnote}><span>O que sustenta cada projeto.</span> Uma obra feita para durar começa com a forma de trabalhar.</p>
        </div>
      </div>
    </section>
  );
}
