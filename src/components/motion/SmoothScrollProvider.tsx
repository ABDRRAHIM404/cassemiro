"use client";

import { useEffect, type ReactNode } from "react";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const desktopPointer = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    let cancelled = false;
    let destroyLenis = () => {};

    const stop = () => {
      destroyLenis();
      destroyLenis = () => {};
    };

    const start = async () => {
      stop();
      if (!desktopPointer.matches) return;

      const { default: Lenis } = await import("lenis");
      if (cancelled || !desktopPointer.matches) return;

      const lenis = new Lenis({
        anchors: { offset: -86 },
        autoRaf: true,
        duration: 1.05,
        smoothWheel: true,
        stopInertiaOnNavigate: true
      });

      destroyLenis = () => lenis.destroy();
    };

    void start();
    desktopPointer.addEventListener("change", start);

    return () => {
      cancelled = true;
      desktopPointer.removeEventListener("change", start);
      stop();
    };
  }, []);

  return children;
}
