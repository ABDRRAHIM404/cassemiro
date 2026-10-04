import { constructionServices } from "./construction-services";

const details = [
  "Antes de uma casa ganhar forma, ela precisa de uma base bem executada.",
  "Pilares e vigas conectam cada parte da casa com responsabilidade.",
  "Os espaços surgem. Cada parede pede alinhamento, medida e atenção.",
  "Água e energia encontram seu caminho, com cuidado no que fica invisível.",
  "Texturas, revestimentos e encontros dão identidade aos ambientes.",
  "Uma só equipe acompanha a construção, da primeira marca à entrega.",
] as const;
export const constructionChapters = constructionServices.map((service, index) => ({
  title: service.title, text: service.text, detail: details[index],
}));
// Complete architectural stage illustrations, not cropped slices or a frame sequence.
export const constructionArtwork = [
  { name: "finished", desktop: "/images/story/house-finished-v1.webp", mobile: "/images/story/house-finished-mobile-v1.webp" },
  { name: "foundation", desktop: "/images/story/house-foundation-v2.webp", mobile: "/images/story/house-foundation-mobile-v2.webp" },
  { name: "structure", desktop: "/images/story/house-structure-v2.webp", mobile: "/images/story/house-structure-mobile-v2.webp" },
  { name: "walls", desktop: "/images/story/house-walls-v2.webp", mobile: "/images/story/house-walls-mobile-v2.webp" },
  { name: "installations", desktop: "/images/story/house-installations-v2.webp", mobile: "/images/story/house-installations-mobile-v2.webp" },
] as const;
