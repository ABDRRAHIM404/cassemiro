"use client";

import { useEffect, useRef } from "react";

type DecodedFrame = ImageBitmap | HTMLImageElement;

type HeroFrameSequenceProps = {
  desktopFrames: string[];
  mobileFrames: string[];
  desktopPoster: string | null;
  mobilePoster: string | null;
};

const MOBILE_QUERY = "(max-width: 767px), (orientation: portrait) and (max-width: 1024px)";
const MAX_DECODED_DESKTOP_FRAMES = 24;
const MAX_DECODED_MOBILE_FRAMES = 18;
const PRELOAD_BEHIND = 3;
const PRELOAD_AHEAD = 8;
const MAX_CONCURRENT_LOADS = 3;

interface NavigatorWithDeviceHints extends Navigator {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
}

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

function shouldUseStaticFallback() {
  const device = navigator as NavigatorWithDeviceHints;
  const hasVeryLowMemory = typeof device.deviceMemory === "number" && device.deviceMemory <= 1;
  const hasVeryFewCores = typeof device.hardwareConcurrency === "number" && device.hardwareConcurrency <= 2;

  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    device.connection?.saveData === true ||
    (hasVeryLowMemory && hasVeryFewCores)
  );
}

function closeFrame(frame: DecodedFrame) {
  if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) frame.close();
}

function drawCover(context: CanvasRenderingContext2D, frame: DecodedFrame, alpha = 1) {
  const canvas = context.canvas;
  const scale = Math.max(canvas.width / frame.width, canvas.height / frame.height);
  const width = frame.width * scale;
  const height = frame.height * scale;

  context.globalAlpha = alpha;
  context.drawImage(frame, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
}

async function decodeFrame(url: string, signal: AbortSignal): Promise<DecodedFrame> {
  if ("createImageBitmap" in window) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Unable to load frame: ${url}`);
    return createImageBitmap(await response.blob());
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const abort = () => {
      image.src = "";
      reject(new DOMException("Frame load aborted", "AbortError"));
    };

    signal.addEventListener("abort", abort, { once: true });
    image.decoding = "async";
    image.onload = () => {
      signal.removeEventListener("abort", abort);
      resolve(image);
    };
    image.onerror = () => {
      signal.removeEventListener("abort", abort);
      reject(new Error(`Unable to load frame: ${url}`));
    };
    image.src = url;
  });
}

export function HeroFrameSequence({
  desktopFrames,
  mobileFrames,
  desktopPoster,
  mobilePoster,
}: HeroFrameSequenceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const section = root?.closest<HTMLElement>(".hero");
    const context = canvas?.getContext("2d", { alpha: false });

    if (!root || !canvas || !section || !context || shouldUseStaticFallback()) return;

    const mobileMedia = window.matchMedia(MOBILE_QUERY);
    let frames = mobileMedia.matches && mobileFrames.length ? mobileFrames : desktopFrames;
    if (frames.length < 2) return;

    let cache = new Map<number, DecodedFrame>();
    let controllers = new Map<number, AbortController>();
    let queue: number[] = [];
    let activeLoads = 0;
    let currentPosition = 0;
    let generation = 0;
    let animationFrame = 0;
    let consecutiveFailures = 0;
    let destroyed = false;

    const maxCacheSize = () => mobileMedia.matches
      ? MAX_DECODED_MOBILE_FRAMES
      : MAX_DECODED_DESKTOP_FRAMES;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * pixelRatio));
      const height = Math.max(1, Math.round(rect.height * pixelRatio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const touchCacheEntry = (index: number) => {
      const frame = cache.get(index);
      if (!frame) return;
      cache.delete(index);
      cache.set(index, frame);
    };

    const trimCache = () => {
      const protectedIndexes = new Set([Math.floor(currentPosition), Math.ceil(currentPosition)]);
      while (cache.size > maxCacheSize()) {
        const candidate = Array.from(cache.keys()).find((index) => !protectedIndexes.has(index));
        if (candidate === undefined) break;
        const frame = cache.get(candidate);
        if (frame) closeFrame(frame);
        cache.delete(candidate);
      }
    };

    const draw = () => {
      resizeCanvas();

      const lowerIndex = Math.floor(currentPosition);
      const upperIndex = Math.min(frames.length - 1, Math.ceil(currentPosition));
      const lower = cache.get(lowerIndex);
      const upper = cache.get(upperIndex);
      if (!lower && !upper) return;

      context.globalAlpha = 1;
      context.fillStyle = "#161514";
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (lower && upper && lowerIndex !== upperIndex) {
        drawCover(context, lower, 1);
        drawCover(context, upper, currentPosition - lowerIndex);
        touchCacheEntry(lowerIndex);
        touchCacheEntry(upperIndex);
      } else {
        const frame = lower ?? upper;
        if (frame) drawCover(context, frame);
      }

      context.globalAlpha = 1;
      root.classList.add("hero-sequence--ready");
    };

    const pumpQueue = () => {
      while (!destroyed && activeLoads < MAX_CONCURRENT_LOADS && queue.length) {
        const index = queue.shift();
        if (index === undefined || cache.has(index) || controllers.has(index)) continue;

        const controller = new AbortController();
        const loadGeneration = generation;
        controllers.set(index, controller);
        activeLoads += 1;

        void decodeFrame(frames[index], controller.signal)
          .then((frame) => {
            if (destroyed || controller.signal.aborted || loadGeneration !== generation) {
              closeFrame(frame);
              return;
            }
            cache.set(index, frame);
            consecutiveFailures = 0;
            trimCache();
            draw();
          })
          .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === "AbortError") return;
            consecutiveFailures += 1;
            if (consecutiveFailures >= 6) root.classList.add("hero-sequence--failed");
          })
          .finally(() => {
            if (controllers.get(index) === controller) controllers.delete(index);
            activeLoads -= 1;
            pumpQueue();
          });
      }
    };

    const reprioritize = (position: number, direction: number) => {
      const lowerIndex = Math.floor(position);
      const upperIndex = Math.min(frames.length - 1, Math.ceil(position));
      const prioritized: number[] = [lowerIndex, upperIndex];
      const forward = direction >= 0 ? 1 : -1;

      for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
        prioritized.push(lowerIndex + offset * forward);
      }
      for (let offset = 1; offset <= PRELOAD_BEHIND; offset += 1) {
        prioritized.push(lowerIndex - offset * forward);
      }

      queue = [...new Set(prioritized)].filter(
        (index) => index >= 0 && index < frames.length && !cache.has(index),
      );
      const useful = new Set(queue);
      useful.add(lowerIndex);
      useful.add(upperIndex);

      controllers.forEach((controller, index) => {
        if (!useful.has(index)) controller.abort();
      });
      pumpQueue();
    };

    const updateFromScroll = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const distance = Math.max(1, section.offsetHeight - viewportHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      const nextPosition = progress * (frames.length - 1);
      const direction = nextPosition === currentPosition ? 1 : Math.sign(nextPosition - currentPosition);

      currentPosition = nextPosition;
      draw();
      reprioritize(currentPosition, direction);
    };

    const requestUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateFromScroll);
    };

    const resetSequence = () => {
      const nextFrames = mobileMedia.matches && mobileFrames.length ? mobileFrames : desktopFrames;
      if (nextFrames === frames) {
        requestUpdate();
        return;
      }

      generation += 1;
      controllers.forEach((controller) => controller.abort());
      cache.forEach(closeFrame);
      controllers = new Map();
      cache = new Map();
      queue = [];
      frames = nextFrames;
      root.classList.remove("hero-sequence--ready", "hero-sequence--failed");
      requestUpdate();
    };

    updateFromScroll();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    window.addEventListener("orientationchange", resetSequence, { passive: true });
    window.visualViewport?.addEventListener("resize", requestUpdate, { passive: true });
    mobileMedia.addEventListener("change", resetSequence);

    return () => {
      destroyed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("orientationchange", resetSequence);
      window.visualViewport?.removeEventListener("resize", requestUpdate);
      mobileMedia.removeEventListener("change", resetSequence);
      controllers.forEach((controller) => controller.abort());
      cache.forEach(closeFrame);
    };
  }, [desktopFrames, mobileFrames]);

  const fallbackPoster = desktopPoster ?? desktopFrames[0] ?? mobilePoster ?? mobileFrames[0];
  if (!fallbackPoster) {
    return <div ref={rootRef} className="hero-sequence hero-sequence--fallback"><ArchitecturalFallback /></div>;
  }

  return (
    <div ref={rootRef} className="hero-sequence">
      <picture className="hero-sequence__poster">
        {mobilePoster ? <source media={MOBILE_QUERY} srcSet={mobilePoster} /> : null}
        <img
          src={fallbackPoster}
          alt="Construção de uma residência, do alicerce ao acabamento"
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
      </picture>
      <canvas ref={canvasRef} className="hero-sequence__canvas" aria-hidden="true" />
    </div>
  );
}
