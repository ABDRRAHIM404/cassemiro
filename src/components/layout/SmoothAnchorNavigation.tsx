"use client";

import { useEffect } from "react";

export function SmoothAnchorNavigation() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href);
      if (!url.hash || url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;

      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;

      event.preventDefault();
      if (location.hash !== url.hash) history.pushState(null, "", url.hash);
      target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
