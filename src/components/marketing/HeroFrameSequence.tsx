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
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (
      frames.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 767px), (pointer: coarse)").matches
    ) return;
    let ticking = false;
    const update = () => {
      const section = sectionRef.current?.closest<HTMLElement>(".hero");
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const distance = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      setFrameIndex(Math.round(progress * (frames.length - 1)));
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [frames]);

  useEffect(() => {
    if (!frames.length) return;
    [frameIndex - 1, frameIndex, frameIndex + 1].forEach((index) => {
      if (frames[index]) {
        const image = new Image();
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
        <img src={frames[frameIndex] ?? poster ?? frames[0]} alt="Construção de uma residência, do alicerce ao acabamento" />
      </div>
    </div>
  );
}
