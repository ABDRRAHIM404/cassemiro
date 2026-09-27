import frameManifest from "./hero-frames.json";

export const heroDesktopFrames: string[] = frameManifest.desktop;
export const heroMobileFrames: string[] = frameManifest.mobile;

export const heroDesktopPoster: string | null = heroDesktopFrames[0] ?? null;
export const heroMobilePoster: string | null = heroMobileFrames[0] ?? heroDesktopPoster;
