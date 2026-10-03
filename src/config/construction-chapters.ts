import { constructionServices } from "./construction-services";

// Curate the original phase holds; never import the full timeline into this UI.
const frames = ["029", "069", "110", "135", "165", "188"] as const;
export const constructionChapters = constructionServices.map((service, index) => ({
  title: service.title,
  text: service.text,
  desktop: `/media/hero/frames-webp/frame_${frames[index]}.webp`,
  mobile: `/media/hero/frames-mobile-webp/frame_${frames[index]}.webp`,
}));
