import assert from "node:assert/strict";
import test from "node:test";
import { socialMetadata, titleWithSingleBrand } from "../src/lib/seo.ts";

test("custom titles already ending in CASSEMIRO bypass the parent suffix", () => {
  assert.deepEqual(titleWithSingleBrand("Residência Linear | CASSEMIRO"), { absolute: "Residência Linear | CASSEMIRO" });
  assert.equal(titleWithSingleBrand("Residência Linear"), "Residência Linear");
});

test("social previews share a complete branded fallback without borrowing page copy", () => {
  const { openGraph, twitter } = socialMetadata("Instalações", "Instalações elétricas e hidráulicas.");
  assert.equal(openGraph.title, "Instalações");
  assert.equal(twitter.description, "Instalações elétricas e hidráulicas.");
  assert.equal(twitter.card, "summary_large_image");
  assert.deepEqual(openGraph.images, twitter.images);
  assert.deepEqual(openGraph.images[0], {
    url: "/social-preview", alt: "CASSEMIRO — Construção e reformas em Sorocaba e região",
    width: 1200, height: 630, type: "image/png"
  });
});

test("project social previews preserve real cover and verified alternative without invented dimensions", () => {
  const image = { url: "/api/project-media/real-id", alt: "Fachada durante a construção" };
  const metadata = socialMetadata("Residência", "Projeto realizado", image);
  assert.deepEqual(metadata.openGraph.images, [image]);
  assert.deepEqual(metadata.twitter.images, [image]);
  assert.equal("width" in metadata.openGraph.images[0], false);
});
