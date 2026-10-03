import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const config = readFileSync("src/config/construction-chapters.ts", "utf8");
const frames = [...config.matchAll(/"(\d{3})"/g)].map((match) => match[1]);

test("six original construction chapters fit a small responsive asset budget", () => {
  assert.deepEqual(frames, ["029", "069", "110", "135", "165", "188"]);
  for (const [directory, budget] of [["frames-webp", 500 * 1024], ["frames-mobile-webp", 180 * 1024]]) {
    const bytes = frames.reduce((sum, frame) => sum + statSync(`public/media/hero/${directory}/frame_${frame}.webp`).size, 0);
    assert.ok(bytes < budget, `${directory}: ${bytes} exceeds the six-photo budget`);
  }
  assert.ok(!config.includes('from "./hero"'));
  assert.ok(!config.includes("hero-frames.json"));
});

test("the homepage no longer mounts frame decoding or an early wheel lock", () => {
  const hero = readFileSync("src/components/marketing/Hero.tsx", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const chapters = readFileSync("src/components/marketing/ConstructionChapters.tsx", "utf8");
  assert.ok(hero.includes("ConstructionChapters"));
  assert.ok(!hero.includes("HeroFrameSequence"));
  assert.ok(!layout.includes("hero-early-wheel"));
  assert.ok(!chapters.includes("createImageBitmap"));
  assert.ok(!chapters.includes("requestAnimationFrame"));
  assert.ok(chapters.includes('type="radio"'));
  assert.ok(chapters.includes('decoding="async"'));
});
