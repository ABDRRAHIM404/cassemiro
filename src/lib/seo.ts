import type { Metadata } from "next";

export function titleWithSingleBrand(title: string): Metadata["title"] {
  return /[|—–]\s*CASSEMIRO\s*$/iu.test(title) ? { absolute: title } : title;
}

/** Explicit per-page social metadata avoids inheriting unrelated homepage copy. */
export function socialMetadata(title: string, description: string, image?: { url: string; alt: string }): Pick<Metadata, "openGraph" | "twitter"> {
  const preview = image ?? {
    url: "/social-preview",
    alt: "CASSEMIRO — Construção e reformas em Sorocaba e região",
    width: 1200,
    height: 630,
    type: "image/png"
  };
  return {
    openGraph: { type: "website", locale: "pt_BR", siteName: "CASSEMIRO", title, description, images: [preview] },
    twitter: { card: "summary_large_image", title, description, images: [preview] }
  };
}
