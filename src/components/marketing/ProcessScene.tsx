"use client";

import { useEffect, useRef, useState } from "react";
import { processStages } from "@/config/site";

export function ProcessScene() {
  const ref = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      const section = ref.current;
      if (!section) {
        ticking = false;
        return;
      }
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const distance = Math.max(1, section.offsetHeight - viewportHeight);
      const progress = Math.min(0.999, Math.max(0, -rect.top / distance));
      const nextStage = Math.floor(progress * processStages.length);

      setActive((currentStage) => currentStage === nextStage ? currentStage : nextStage);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        animationFrameRef.current = requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("orientationchange", onScroll, { passive: true });
    window.visualViewport?.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("orientationchange", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const stage = processStages[active];

  return (
    <section id="processo" ref={ref} className="process" aria-labelledby="process-title">
      <div className="process__sticky">
        <div className="process__blueprint" aria-hidden="true">
          <div className="process__ground" />
          <div className={`process__drawing process__drawing--${active + 1}`}>
            <i className="wall wall--one" /><i className="wall wall--two" /><i className="wall wall--three" />
            <i className="roof" /><i className="door" /><i className="window" />
          </div>
          <span className="measure measure--one">12,40</span><span className="measure measure--two">8,20</span>
        </div>
        <div className="process__content shell">
          <div className="process__intro">
            <p className="eyebrow eyebrow--dark">Como trabalhamos</p>
            <h2 id="process-title">Do alicerce<br />ao <em>acabamento.</em></h2>
          </div>
          <div className="process__stage" aria-live="polite">
            <span>{stage.number} / 04</span>
            <h3>{stage.title}</h3>
            <p>{stage.text}</p>
          </div>
          <div className="process__progress" aria-hidden="true">
            {processStages.map((item, index) => <i key={item.number} className={index <= active ? "is-active" : ""} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
