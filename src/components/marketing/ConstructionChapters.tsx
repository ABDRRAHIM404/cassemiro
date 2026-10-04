"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { constructionChapters, constructionArtwork } from "@/config/construction-chapters";
import styles from "./ConstructionChapters.module.css";

/** Natural scrolling drives the story; the observer only changes discrete chapters. */
export function ConstructionChapters({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) element.dataset.phase = (entry.target as HTMLElement).dataset.storyChapter;
      }
    }, { rootMargin: "-35% 0px -45% 0px", threshold: 0 });
    element.querySelectorAll("[data-story-chapter]").forEach((chapter) => observer.observe(chapter));
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={root} className={styles.chapters} data-phase="0">
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.atmosphere} />
        <div className={styles.model}>
          {constructionArtwork.map((artwork, index) => (
            <picture key={artwork.name} className={`${styles.scene} ${styles[artwork.name]}`} data-artwork={artwork.name}>
              <source media="(max-width: 700px)" srcSet={artwork.mobile} />
              <img src={artwork.desktop} width="1536" height="1024" alt=""
                loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async" draggable={false} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
            </picture>
          ))}
        </div>
        <div className={styles.progress}>
          <span>DO ALICERCE AO ACABAMENTO</span>
          <div>{constructionChapters.map((chapter, index) => <i key={chapter.title} data-step={index + 1} />)}</div>
        </div>
      </div>
      <div className={styles.narrative}>
        <div className={styles.opening} data-story-chapter="0">
          {children}
          <p className={styles.scrollCue}>Uma casa. Cada detalhe. <span>Continue rolando ↓</span></p>
        </div>
        {constructionChapters.map((chapter, index) => (
          <section key={chapter.title} id={index === 0 ? "servicos" : `etapa-${index + 1}`}
            className={styles.chapter} data-story-chapter={index + 1} aria-labelledby={`service-title-${index}`}>
            <div className={styles.chapterCopy}>
              <p className={styles.eyebrow}>ETAPA {String(index + 1).padStart(2, "0")} <span>/ 06</span></p>
              <h2 id={`service-title-${index}`}>{chapter.title}</h2>
              <p className={styles.summary}>{chapter.text}</p>
              <p className={styles.detail}>{chapter.detail}</p>
              {index === 5 && <a className={styles.next} href="#sobre">Conheça quem conduz sua obra <span>↓</span></a>}
            </div>
          </section>
        ))}
        <p className={styles.disclosure}>Visualizações ilustrativas inspiradas na arquitetura dos nossos projetos. As fotografias reais estão no portfólio.</p>
      </div>
    </div>
  );
}
