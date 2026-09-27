import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicRoot = path.resolve("public");
const heroDirectory = path.join(publicRoot, "media/hero");
const desktopSourceDirectory = path.join(heroDirectory, "frames");
const mobileSourceDirectory = path.join(heroDirectory, "frames-mobile");
const desktopOutputDirectory = path.join(heroDirectory, "frames-webp");
const mobileOutputDirectory = path.join(heroDirectory, "frames-mobile-webp");
const manifestPath = path.resolve("src/config/hero-frames.json");
const framePattern = /^frame_(\d+)\.(?:png|jpe?g|webp)$/iu;

function frameNumber(filename) {
  return Number(filename.match(framePattern)?.[1]);
}

async function listFrames(directory) {
  try {
    return (await readdir(directory))
      .filter((filename) => framePattern.test(filename))
      .sort((left, right) => frameNumber(left) - frameNumber(right));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function convertSequence({ sources, sourceDirectory, outputDirectory, width, height, quality }) {
  await mkdir(outputDirectory, { recursive: true });
  const outputNames = sources.map((filename) => filename.replace(/\.(?:png|jpe?g|webp)$/iu, ".webp"));
  let nextFrame = 0;

  async function convertNext() {
    while (nextFrame < sources.length) {
      const index = nextFrame++;
      await sharp(path.join(sourceDirectory, sources[index]))
        .resize(width, height, { fit: "cover", position: "centre" })
        .webp({ quality, effort: 6, smartSubsample: true })
        .toFile(path.join(outputDirectory, outputNames[index]));
    }
  }

  await Promise.all(Array.from({ length: 6 }, () => convertNext()));
  return outputNames;
}

const desktopSources = await listFrames(desktopSourceDirectory);
const suppliedMobileSources = await listFrames(mobileSourceDirectory);
if (desktopSources.length === 0) throw new Error(`No source frames found in ${desktopSourceDirectory}`);

const desktopOutputs = await convertSequence({
  sources: desktopSources,
  sourceDirectory: desktopSourceDirectory,
  outputDirectory: desktopOutputDirectory,
  width: 1280,
  height: 720,
  quality: 80,
});

// Dedicated portrait sources win when supplied. Until then, generate the same
// center framing the site previously produced with object-fit: cover.
const mobileSources = suppliedMobileSources.length ? suppliedMobileSources : desktopSources;
const mobileOutputs = await convertSequence({
  sources: mobileSources,
  sourceDirectory: suppliedMobileSources.length ? mobileSourceDirectory : desktopSourceDirectory,
  outputDirectory: mobileOutputDirectory,
  width: 540,
  height: 960,
  quality: 76,
});

const toPublicPaths = (directory, filenames) => filenames.map(
  (filename) => `/${path.relative(publicRoot, path.join(directory, filename)).split(path.sep).join("/")}`,
);

function toTimelinePaths(directory, filenames) {
  const pathsByFrame = new Map(
    filenames.map((filename) => [frameNumber(filename), toPublicPaths(directory, [filename])[0]]),
  );
  const firstFrame = Math.min(...pathsByFrame.keys());
  const lastFrame = Math.max(...pathsByFrame.keys());
  const timeline = [];
  let mostRecentPath = pathsByFrame.get(firstFrame);

  for (let frame = firstFrame; frame <= lastFrame; frame += 1) {
    mostRecentPath = pathsByFrame.get(frame) ?? mostRecentPath;
    if (mostRecentPath) timeline.push(mostRecentPath);
  }

  return timeline;
}

await writeFile(
  manifestPath,
  `${JSON.stringify({
    desktop: toTimelinePaths(desktopOutputDirectory, desktopOutputs),
    mobile: toTimelinePaths(mobileOutputDirectory, mobileOutputs),
  }, null, 2)}\n`,
);

console.log(`Optimized ${desktopOutputs.length} desktop and ${mobileOutputs.length} mobile hero frames.`);
