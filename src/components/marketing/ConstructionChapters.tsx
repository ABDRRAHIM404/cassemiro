"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { constructionChapters } from "@/config/construction-chapters";
import styles from "./ConstructionChapters.module.css";

export function ConstructionChapters({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  const gesture = useRef<{ x: number; y: number; pointer: number } | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function select(index: number, focus = false) {
    const next = (index + constructionChapters.length) % constructionChapters.length;
    setActive(next);
    if (focus) inputs.current[next]?.focus({ preventScroll: true });
  }

  function startGesture(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    gesture.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.pointer !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.3) select(active + (dx < 0 ? 1 : -1));
  }

  return (
    <div className={styles.chapters}>
      {/* Native radios retain all six chapters without JavaScript. */}
      {constructionChapters.map((chapter, index) => (
        <input key={chapter.title} ref={(node) => { inputs.current[index] = node; }}
          className={styles.input} type="radio" name="construction-chapter"
          id={`construction-chapter-${index}`} aria-controls={`construction-panel-${index}`}
          checked={active === index} onChange={() => select(index)}
          onKeyDown={(event) => {
            if (event.key === "Home" || event.key === "End") {
              event.preventDefault(); select(event.key === "Home" ? 0 : constructionChapters.length - 1, true);
            }
          }} />
      ))}
      <div className={styles.stage}>
        <div className={styles.photographs} onPointerDown={startGesture} onPointerUp={endGesture}
          onPointerCancel={() => { gesture.current = null; }}>
          {constructionChapters.map((chapter, index) => (
            <div className={styles.panel} id={`construction-panel-${index}`} key={chapter.title}>
              {/* Optimized originals: picture chooses only the appropriate device variant. */}
              <picture>
                <source media="(max-width: 700px)" srcSet={chapter.mobile} width="540" height="960" />
                <img src={chapter.desktop} width="1280" height="720" alt={`Construção CASSEMIRO: ${chapter.title.toLowerCase()}`}
                  loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async" draggable={false}
                  onError={() => setFailed((previous) => previous.includes(index) ? previous : [...previous, index])} />
              </picture>
              {failed.includes(index) && <p className={styles.error} role="status">Imagem indisponível. Você pode continuar explorando as etapas.</p>}
              <div className={styles.caption}>
                <h2>{chapter.title}</h2><p>{chapter.text}</p>
              </div>
            </div>
          ))}
        </div>
        {children}
      </div>
      <div id="servicos" className={styles.navigation}>
        <div className={styles.selector} role="group" aria-label="Etapas da construção">
          {constructionChapters.map((chapter, index) => (
            <label htmlFor={`construction-chapter-${index}`} key={chapter.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>{chapter.title}
            </label>
          ))}
        </div>
        <div className={styles.arrows}>
          <button type="button" aria-label="Etapa anterior" onClick={() => select(active - 1)}><span className={styles.previous}><ArrowIcon /></span></button>
          <span aria-live="polite" aria-atomic="true">{String(active + 1).padStart(2, "0")} / 06</span>
          <button type="button" aria-label="Próxima etapa" onClick={() => select(active + 1)}><ArrowIcon /></button>
        </div>
      </div>
      <noscript><style>{`.${styles.arrows} { display: none; }`}</style></noscript>
    </div>
  );
}
