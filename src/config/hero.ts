/**
 * Add supplied frame paths here in their original order when they arrive.
 * Example: "/media/hero/frames/frame-0001.webp"
 */
export const heroFrames: string[] = Array.from(
  { length: 190 },
  (_, index) => `/media/hero/frames-webp/frame_${String(index + 1).padStart(3, "0")}.webp`
);

export const heroPoster: string | null = heroFrames[0];
