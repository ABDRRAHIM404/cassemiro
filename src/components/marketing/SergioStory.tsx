"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { defaultHomepageContent } from "@/lib/site-settings";

export function SergioStory({ content = defaultHomepageContent }: { content?: typeof defaultHomepageContent }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom <= 0 || rect.top >= viewportHeight) return;
      const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height)));
      section.style.setProperty("--story-progress", String(progress));
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
  }, []);

  return (
    <section id="sobre" ref={sectionRef} className="story" aria-labelledby="story-title">
      <div className="story__architecture" aria-hidden="true"><i /><i /><i /></div>
      <div className="story__portrait-layer">
        <Image
          src="/images/references/sergio-portrait-original.jpg"
          alt="Sérgio Cassemiro em uma obra"
          fill
          sizes="(max-width: 760px) 100vw, 58vw"
          className="story__portrait"
        />
      </div>
      <div className="shell story__composition">
        <div className="story__copy">
          <p className="eyebrow">{content.aboutEyebrow}</p>
          <p className="story__experience"><strong>43+</strong><span>anos de<br />experiência</span></p>
          <h2 id="story-title">Sérgio<br /><em>Cassemiro</em></h2>
          <div className="story__role">Fundador · responsável pela obra</div>
          <p>{content.aboutParagraphOne}</p>
          <p>{content.aboutParagraphTwo}</p>
        </div>
        <p className="story__quote">“{content.aboutTitle}”</p>
      </div>
    </section>
  );
}
