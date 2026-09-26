import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("public/media/hero/frames");
const outputDirectory = path.resolve("public/media/hero/frames-webp");
const quality = 80;

await mkdir(outputDirectory, { recursive: true });

const frames = (await readdir(sourceDirectory))
  .filter((filename) => /^frame_\d{3}\.png$/u.test(filename))
  .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));

if (frames.length === 0) {
  throw new Error(`No source frames found in ${sourceDirectory}`);
}

const concurrency = 6;
let nextFrame = 0;

async function convertNext() {
  while (nextFrame < frames.length) {
    const filename = frames[nextFrame++];
    const source = path.join(sourceDirectory, filename);
    const output = path.join(outputDirectory, filename.replace(/\.png$/u, ".webp"));

    await sharp(source)
      .webp({ quality, effort: 6, smartSubsample: true })
      .toFile(output);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => convertNext()));
console.log(`Converted ${frames.length} hero frames to WebP at quality ${quality}.`);
