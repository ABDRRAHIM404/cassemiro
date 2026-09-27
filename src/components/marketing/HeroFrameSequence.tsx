"use client";

import { useEffect, useRef, useState } from "react";

function ArchitecturalFallback() {
  return (
    <div className="hero-architecture" aria-hidden="true">
      <div className="hero-architecture__sun" />
      <div className="hero-architecture__grid" />
      <div className="hero-architecture__volume hero-architecture__volume--back" />
      <div className="hero-architecture__volume hero-architecture__volume--front" />
      <div className="hero-architecture__opening" />
      <div className="hero-architecture__slab" />
      <div className="hero-architecture__line hero-architecture__line--one" />
      <div className="hero-architecture__line hero-architecture__line--two" />
    </div>
  );
}

export function HeroFrameSequence({ frames, poster }: { frames: string[]; poster: string | null }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (frames.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;

    const update = () => {
      const section = sectionRef.current?.closest<HTMLElement>(".hero");
      if (!section) {
        ticking = false;
        return;
      }

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const distance = Math.max(1, section.offsetHeight - viewportHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      const nextFrame = Math.round(progress * (frames.length - 1));

      setFrameIndex((currentFrame) => currentFrame === nextFrame ? currentFrame : nextFrame);
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
  }, [frames]);

  useEffect(() => {
    if (!frames.length) return;

    [frameIndex - 2, frameIndex - 1, frameIndex, frameIndex + 1, frameIndex + 2, frameIndex + 3].forEach((index) => {
      if (frames[index]) {
        const image = new Image();
        image.decoding = "async";
        image.src = frames[index];
      }
    });
  }, [frameIndex, frames]);

  if (!frames.length) {
    return <div ref={sectionRef} className="hero-sequence hero-sequence--fallback"><ArchitecturalFallback /></div>;
  }

  return (
    <div ref={sectionRef} className="hero-sequence">
      <div className="hero-sequence__sticky">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frames[frameIndex] ?? poster ?? frames[0]}
          alt="Construção de uma residência, do alicerce ao acabamento"
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  );
}
