"use client";

import { useEffect, useRef, useState } from "react";

const pillars = [
  { title: "Qualidade", text: "Cuidado técnico, inclusive no que não se vê.", icon: "quality" },
  { title: "Prazos", text: "Planejamento claro em cada etapa da obra.", icon: "time" },
  { title: "Experiência", text: "Mais de quatro décadas orientando cada decisão.", icon: "experience" },
  { title: "Confiança", text: "Presença e responsabilidade do início ao fim.", icon: "trust" },
] as const;

function PillarIcon({ type }: { type: typeof pillars[number]["icon"] }) {
  if (type === "quality") return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5 40 14v20L24 43 8 34V14L24 5Z"/><path d="m16 24 5 5 11-12"/></svg>;
  if (type === "time") return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="25" r="17"/><path d="M24 14v12l8 5M18 5h12"/></svg>;
  if (type === "experience") return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 39h32M12 39V20l12-9 12 9v19M19 39V27h10v12"/><path d="M7 20 24 7l17 13"/></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 43S39 35 39 20V10L24 5 9 10v10c0 15 15 23 15 23Z"/><path d="m17 24 5 5 10-11"/></svg>;
}

export function WhyCassemiro({ imageUrl }: { imageUrl?: string | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const heading = headingRef.current;
    if (!section || !heading) return;

    const reveal = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        heading.dataset.visible = "true";
        reveal.disconnect();
      }
    }, { threshold: 0.3 });
    reveal.observe(heading);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)");
    let frame = 0;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom <= 0 || rect.top >= viewportHeight) return;
      if (mobile.matches) {
        const items = section.querySelectorAll<HTMLElement>(".why__pillar");
        let nearest = 0;
        let nearestDistance = Infinity;
        items.forEach((item, index) => {
          const distance = Math.abs(item.getBoundingClientRect().top + item.offsetHeight / 2 - viewportHeight * 0.55);
          if (distance < nearestDistance) {
            nearest = index;
            nearestDistance = distance;
          }
        });
        setActiveIndex(nearest);
      } else {
        const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - viewportHeight)));
        if (!reducedMotion.matches) {
          setActiveIndex(Math.min(pillars.length - 1, Math.floor(progress * pillars.length)));
          section.style.setProperty("--why-progress", String(progress));
        }
      }
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    return () => {
      reveal.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <section ref={sectionRef} className="why" aria-labelledby="why-title">
      <div className="why__sticky">
        <div className="why__image" style={{ backgroundImage: `url("${imageUrl || "/media/hero/frames-webp/frame_100.webp"}")` }} aria-hidden="true" />
        <div className="why__shade" aria-hidden="true" />
        <div className="why__grid" aria-hidden="true" />
        <div className="why__glow" aria-hidden="true" />
        <div className="shell why__content">
          <div ref={headingRef} className="why__heading">
            <p className="eyebrow">O que sustenta cada projeto</p>
            <h2 id="why-title">Por que escolher<br /> <em>a CASSEMIRO?</em></h2>
            <p>Mais que construir, assumir cada detalhe como nosso.</p>
          </div>
          <div className="why__experience">
            <div className="why__feature" aria-live="polite">
              {pillars.map((pillar, index) => (
                <div className={`why__feature-item${activeIndex === index ? " is-active" : ""}`} aria-hidden={activeIndex !== index} key={pillar.title}>
                  <span className="why__feature-number">0{index + 1} <i /> 04</span>
                  <PillarIcon type={pillar.icon} />
                  <h3>{pillar.title}</h3>
                  <p>{pillar.text}</p>
                </div>
              ))}
            </div>
            <div className="why__pillars" aria-label="Compromissos CASSEMIRO">
              {pillars.map((pillar, index) => (
                <button className={`why__pillar${activeIndex === index ? " is-active" : ""}`} type="button" aria-pressed={activeIndex === index} onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onClick={() => setActiveIndex(index)} key={pillar.title}>
                  <span className="why__pillar-number">0{index + 1}</span>
                  <span className="why__pillar-name">{pillar.title}</span>
                  <span className="why__pillar-arrow" aria-hidden="true">↗</span>
                  <span className="why__pillar-detail">{pillar.text}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="why__footnote">Uma obra feita para durar começa com a forma de trabalhar.</p>
        </div>
      </div>
    </section>
  );
}
