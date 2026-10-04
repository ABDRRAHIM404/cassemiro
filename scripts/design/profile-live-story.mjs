// GET-only lab profile of the current production story, not field CWV.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({
  executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
  headless: true,
  args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
  proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" },
});
try {
  for (const width of [390, 1366]) {
    for (let run = 1; run <= 3; run++) {
      const mobile = width === 390;
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: mobile, hasTouch: mobile });
      await context.route("**/*", route => route.request().method() === "GET" ? route.continue() : route.abort());
      try {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.name));
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Performance.enable");
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: mobile ? 4 : 1 });
        await cdp.send("Network.emulateNetworkConditionsByRule", { offline: false, matchedNetworkConditions: [{
          urlPattern: "", latency: mobile ? 150 : 30,
          downloadThroughput: (mobile ? 200 : 1000) * 1024, uploadThroughput: 500 * 1024,
        }] });
        const resources = new Map();
        cdp.on("Network.requestWillBeSent", event => {
          const pathname = new URL(event.request.url).pathname;
          resources.set(event.requestId, { pathname, type: event.type, bytes: 0, finished: false });
        });
        cdp.on("Network.loadingFinished", event => {
          const entry = resources.get(event.requestId);
          if (entry) Object.assign(entry, { bytes: event.encodedDataLength, finished: true });
        });
        await page.addInitScript(() => {
          window.__storyProfile = { lcp: null, shifts: [], tasks: [] };
          for (const type of ["largest-contentful-paint", "layout-shift", "longtask"]) {
            new PerformanceObserver(list => {
              for (const entry of list.getEntries()) {
                if (type === "largest-contentful-paint") window.__storyProfile.lcp = { ms: entry.startTime, tag: entry.element?.tagName, id: entry.element?.id || null };
                if (type === "layout-shift" && !entry.hadRecentInput) window.__storyProfile.shifts.push({ at: entry.startTime, value: entry.value });
                if (type === "longtask") window.__storyProfile.tasks.push({ at: entry.startTime, duration: entry.duration });
              }
            }).observe({ type, buffered: true });
          }
        });
        assert.equal((await page.goto("https://cassemiro-one.vercel.app", { waitUntil: "domcontentloaded", timeout: 30000 })).status(), 200);
        // Bounded observation period; do not wait on analytics/network idle.
        await page.waitForTimeout(8000);
        const initial = await page.evaluate(() => {
          const navigation = performance.getEntriesByType("navigation")[0];
          const paints = performance.getEntriesByType("paint");
          return { ttfbMs: navigation.responseStart, fcpMs: paints.find(e => e.name === "first-contentful-paint")?.startTime ?? null,
            lcp: window.__storyProfile.lcp, longTasks: window.__storyProfile.tasks.length, observedAtMs: performance.now() };
        });
        const initialResources = [...resources.values()];
        const initialTransfer = { completedRequests: initialResources.filter(r => r.finished).length,
          totalBytes: initialResources.reduce((sum, r) => sum + r.bytes, 0),
          scriptBytes: initialResources.filter(r => r.type === "Script").reduce((sum, r) => sum + r.bytes, 0),
          imageBytes: initialResources.filter(r => r.type === "Image").reduce((sum, r) => sum + r.bytes, 0) };
        const heapBefore = (await cdp.send("Performance.getMetrics")).metrics.find(m => m.name === "JSHeapUsedSize")?.value;
        const scrolling = await page.evaluate(async () => {
          const last = document.querySelector('[data-story-chapter="6"]');
          const end = last.getBoundingClientRect().bottom + scrollY - innerHeight;
          const gaps = [];
          const start = performance.now();
          let previous = start;
          await new Promise(resolve => {
            const step = now => {
              gaps.push(now - previous); previous = now;
              const progress = Math.min(1, (now - start) / 6000);
              scrollTo({ top: end * progress, behavior: "instant" });
              if (progress < 1) requestAnimationFrame(step); else resolve();
            };
            requestAnimationFrame(step);
          });
          gaps.sort((a, b) => a - b);
          return { startMs: start, durationMs: performance.now() - start, rafSamples: gaps.length,
            rafP95Ms: gaps[Math.floor(gaps.length * .95)], rafMaxMs: gaps.at(-1),
            gapsOver50Ms: gaps.filter(gap => gap > 50).length };
        });
        const after = await page.evaluate(start => {
          let sessionStart = 0, last = 0, session = 0, cls = 0;
          for (const shift of window.__storyProfile.shifts) {
            if (shift.at - last > 1000 || shift.at - sessionStart > 5000) { sessionStart = shift.at; session = 0; }
            session += shift.value; last = shift.at; cls = Math.max(cls, session);
          }
          return { cls, scrollLongTasks: window.__storyProfile.tasks.filter(task => task.at >= start).length,
            canvasCount: document.querySelectorAll("canvas").length, overflow: document.documentElement.scrollWidth > innerWidth };
        }, scrolling.startMs);
        const heapAfter = (await cdp.send("Performance.getMetrics")).metrics.find(m => m.name === "JSHeapUsedSize")?.value;
        assert.deepEqual(errors, []);
        assert.equal(after.overflow, false);
        assert.equal(after.canvasCount, 0);
        assert.equal([...resources.values()].some(r => r.pathname.startsWith("/media/hero/")), false);
        console.log(JSON.stringify({ width, run, cpuSlowdown: mobile ? 4 : 1, latencyMs: mobile ? 150 : 30,
          downloadKiBps: mobile ? 200 : 1000, initial, initialTransfer, scrolling, after,
          jsHeapUsedBytes: { before: heapBefore, after: heapAfter }, runtimeErrors: 0,
          scope: "Cold client cache, proxy HTTP/1, headless Chromium lab; rAF is not compositor FPS, JS heap is not total memory, no field INP/p75 claim" }));
      } finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
