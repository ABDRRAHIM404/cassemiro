"use client";

import { useEffect, useRef } from "react";
import { constructionServices } from "@/config/construction-services";

type DecodedFrame = ImageBitmap | HTMLImageElement;

type HeroFrameSequenceProps = {
  desktopFrames: string[];
  mobileFrames: string[];
  desktopPoster: string | null;
  mobilePoster: string | null;
};

const MOBILE_QUERY = "(max-width: 767px), (orientation: portrait) and (max-width: 1024px)";
const MAX_DECODED_DESKTOP_FRAMES = 16;
const MAX_DECODED_MOBILE_FRAMES = 10;
const PRELOAD_BEHIND = 4;
const PRELOAD_AHEAD = 6;
const MAX_CONCURRENT_LOADS = 2;
const ABORT_DISTANCE = 10;
const MAX_CANVAS_PIXELS = 2_000_000;

const SERVICE_START_PROGRESS = 0.1;
const HOLD_START = 0.3;
const HOLD_END = 0.67;
const WHEEL_DELTA_THRESHOLD = 4;
const WHEEL_GESTURE_IDLE_MS = 1100;
const MIN_SNAP_LOCK_MS = 1100;

const serviceSnapProgresses = constructionServices.map((_, index) => (
  SERVICE_START_PROGRESS + ((index + 0.5) / constructionServices.length) * (1 - SERVICE_START_PROGRESS)
));

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function timelineState(rawProgress: number) {
  if (rawProgress < SERVICE_START_PROGRESS) {
    return {
      sourceProgress: (rawProgress / SERVICE_START_PROGRESS) * constructionServices[0].frameStart,
      stage: -1,
      stageProgress: 0,
    };
  }

  const serviceProgress = (rawProgress - SERVICE_START_PROGRESS) / (1 - SERVICE_START_PROGRESS);
  const scaledProgress = Math.min(constructionServices.length - 0.000001, serviceProgress * constructionServices.length);
  const stage = Math.floor(scaledProgress);
  const stageProgress = scaledProgress - stage;
  const phase = constructionServices[stage];
  let sourceProgress: number = phase.frameHold;

  if (stageProgress < HOLD_START) {
    sourceProgress = lerp(phase.frameStart, phase.frameHold, stageProgress / HOLD_START);
  } else if (stageProgress > HOLD_END) {
    sourceProgress = lerp(phase.frameHold, phase.frameEnd, (stageProgress - HOLD_END) / (1 - HOLD_END));
  }

  return { sourceProgress, stage, stageProgress };
}

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
    let lastScheduledIndex = -1;
    let lastScheduledDirection = 1;
    let generation = 0;
    let animationFrame = 0;
    let consecutiveFailures = 0;
    let destroyed = false;
    let lastServiceStage = -2;
    let wheelGestureLocked = false;
    let wheelReleaseTimer = 0;
    let snapLockedUntil = 0;
    let wasInView = false;

    const serviceItems = Array.from(root.querySelectorAll<HTMLElement>(".hero-service"));
    const serviceProgressItems = Array.from(root.querySelectorAll<HTMLElement>(".hero-services__progress i"));

    const maxCacheSize = () => mobileMedia.matches
      ? MAX_DECODED_MOBILE_FRAMES
      : MAX_DECODED_DESKTOP_FRAMES;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        1.25,
        Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, rect.width * rect.height)),
      );
      const width = Math.max(1, Math.round(rect.width * pixelRatio));
      const height = Math.max(1, Math.round(rect.height * pixelRatio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
      }
      return false;
    };

    const touchCacheEntry = (index: number) => {
      const frame = cache.get(index);
      if (!frame) return;
      cache.delete(index);
      cache.set(index, frame);
    };

    const trimCache = (maxEntries = maxCacheSize()) => {
      const protectedIndexes = new Set([Math.floor(currentPosition), Math.ceil(currentPosition)]);
      while (cache.size > maxEntries) {
        const candidate = Array.from(cache.keys()).find((index) => !protectedIndexes.has(index));
        if (candidate === undefined) break;
        const frame = cache.get(candidate);
        if (frame) closeFrame(frame);
        cache.delete(candidate);
      }
    };

    const draw = () => {
      const lowerIndex = Math.floor(currentPosition);
      const upperIndex = Math.min(frames.length - 1, Math.ceil(currentPosition));
      const lower = cache.get(lowerIndex);
      const upper = cache.get(upperIndex);
      const nearest = !lower && !upper
        ? Array.from(cache.entries()).reduce<{ index: number; frame: DecodedFrame } | null>(
            (closest, [index, frame]) => (
              !closest || Math.abs(index - currentPosition) < Math.abs(closest.index - currentPosition)
                ? { index, frame }
                : closest
            ),
            null,
          )?.frame
        : null;
      if (!lower && !upper && !nearest) return;

      context.globalAlpha = 1;
      if (lower && upper && lowerIndex !== upperIndex) {
        drawCover(context, lower, 1);
        drawCover(context, upper, currentPosition - lowerIndex);
        touchCacheEntry(lowerIndex);
        touchCacheEntry(upperIndex);
      } else {
        const frame = lower ?? upper ?? nearest;
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
            if (
              index === Math.floor(currentPosition) ||
              index === Math.ceil(currentPosition) ||
              !root.classList.contains("hero-sequence--ready")
            ) draw();
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
        (index) => (
          index >= 0 &&
          index < frames.length &&
          !cache.has(index) &&
          !controllers.has(index)
        ),
      );

      controllers.forEach((controller, index) => {
        if (Math.abs(index - lowerIndex) > ABORT_DISTANCE) controller.abort();
      });
      pumpQueue();
    };

    const updateFromScroll = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const inView = rect.bottom > 0 && rect.top < viewportHeight;
      if (!inView) {
        if (wasInView) {
          wasInView = false;
          queue = [];
          controllers.forEach((controller) => controller.abort());
          trimCache(4);
          lastScheduledIndex = -1;
        }
        return;
      }
      wasInView = true;
      const distance = Math.max(1, section.offsetHeight - viewportHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      const timeline = timelineState(progress);
      const nextPosition = timeline.sourceProgress * (frames.length - 1);
      const direction = nextPosition === currentPosition ? 1 : Math.sign(nextPosition - currentPosition);

      if (timeline.stage !== lastServiceStage) {
        lastServiceStage = timeline.stage;
        section.dataset.sequencePhase = timeline.stage < 0 ? "intro" : "services";
        serviceItems.forEach((item, index) => {
          const isActive = index === timeline.stage;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-hidden", String(!isActive));
        });
        serviceProgressItems.forEach((item, index) => item.classList.toggle("is-active", index <= timeline.stage));
      }

      const activeService = timeline.stage >= 0 ? serviceItems[timeline.stage] : null;
      if (activeService) {
        const edgeFade = Math.min(1, timeline.stageProgress / 0.1, (1 - timeline.stageProgress) / 0.1);
        activeService.style.setProperty("--service-presence", String(Math.max(0, edgeFade)));
      }

      const positionChanged = nextPosition !== currentPosition;
      currentPosition = nextPosition;
      if (positionChanged || !root.classList.contains("hero-sequence--ready")) draw();

      const currentIndex = Math.floor(currentPosition);
      if (currentIndex !== lastScheduledIndex || direction !== lastScheduledDirection) {
        lastScheduledIndex = currentIndex;
        lastScheduledDirection = direction;
        reprioritize(currentPosition, direction);
      }
    };

    const requestUpdate = () => {
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        updateFromScroll();
      });
    };

    const handleResize = () => {
      if (resizeCanvas() && wasInView) draw();
      requestUpdate();
    };

    const scheduleWheelRelease = () => {
      window.clearTimeout(wheelReleaseTimer);
      const remainingLock = Math.max(0, snapLockedUntil - performance.now());
      wheelReleaseTimer = window.setTimeout(() => {
        wheelGestureLocked = false;
      }, Math.max(WHEEL_GESTURE_IDLE_MS, remainingLock));
    };

    const handleServiceWheel = (event: WheelEvent) => {
      if (mobileMedia.matches) return;

      if (wheelGestureLocked) {
        event.preventDefault();
        scheduleWheelRelease();
        return;
      }

      if (Math.abs(event.deltaY) < WHEEL_DELTA_THRESHOLD) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const distance = Math.max(1, section.offsetHeight - viewportHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      const isPinned = rect.top <= 1 && rect.bottom >= viewportHeight - 1;

      if (!isPinned) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      if (progress < SERVICE_START_PROGRESS && direction < 0) return;
      const tolerance = 0.012;
      const targetStage = direction > 0
        ? serviceSnapProgresses.findIndex((snapProgress) => snapProgress > progress + tolerance)
        : serviceSnapProgresses.findLastIndex((snapProgress) => snapProgress < progress - tolerance);

      event.preventDefault();
      wheelGestureLocked = true;
      snapLockedUntil = performance.now() + MIN_SNAP_LOCK_MS;
      scheduleWheelRelease();

      let targetTop: number;
      if (direction > 0 && targetStage === -1) {
        targetTop = section.offsetTop + distance + Math.min(220, viewportHeight * 0.25);
        section.dataset.snapTarget = "next";
      } else if (direction < 0 && targetStage === -1) {
        targetTop = section.offsetTop + distance * (SERVICE_START_PROGRESS * 0.45);
        section.dataset.snapTarget = "intro";
      } else {
        targetTop = section.offsetTop + distance * serviceSnapProgresses[targetStage];
        section.dataset.snapTarget = String(targetStage);
      }

      window.scrollTo({ top: targetTop, behavior: "smooth" });
    };

    const resetSequence = () => {
      const nextFrames = mobileMedia.matches && mobileFrames.length ? mobileFrames : desktopFrames;
      if (nextFrames === frames) {
        handleResize();
        return;
      }

      generation += 1;
      controllers.forEach((controller) => controller.abort());
      cache.forEach(closeFrame);
      controllers = new Map();
      cache = new Map();
      queue = [];
      frames = nextFrames;
      lastScheduledIndex = -1;
      lastScheduledDirection = 1;
      root.classList.remove("hero-sequence--ready", "hero-sequence--failed");
      resizeCanvas();
      requestUpdate();
    };

    resizeCanvas();
    updateFromScroll();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("wheel", handleServiceWheel, { passive: false });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", resetSequence, { passive: true });
    window.visualViewport?.addEventListener("resize", handleResize, { passive: true });
    mobileMedia.addEventListener("change", resetSequence);

    return () => {
      destroyed = true;
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(wheelReleaseTimer);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("wheel", handleServiceWheel);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", resetSequence);
      window.visualViewport?.removeEventListener("resize", handleResize);
      mobileMedia.removeEventListener("change", resetSequence);
      delete section.dataset.sequencePhase;
      delete section.dataset.snapTarget;
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
      <div id="servicos" className="hero-services shell" aria-label="Serviços por etapa da construção">
        <div className="hero-services__line" aria-hidden="true" />
        {constructionServices.map((service, index) => (
          <article className="hero-service" aria-hidden="true" key={service.title}>
            <span>Etapa {String(index + 1).padStart(2, "0")}</span>
            <h2>{service.title}</h2>
            <p>{service.text}</p>
          </article>
        ))}
        <div className="hero-services__progress" aria-hidden="true">
          {constructionServices.map((service, index) => <i key={service.title}><span>{String(index + 1).padStart(2, "0")}</span></i>)}
        </div>
      </div>
    </div>
  );
}
