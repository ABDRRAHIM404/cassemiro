import assert from "node:assert/strict";
import test from "node:test";
import { publishedLinkedProjects, visibleServiceTitles } from "../src/lib/public-project-links-filter.ts";

test("privileged project-link reads expose only visible services", () => {
  assert.deepEqual(visibleServiceTitles([
    { services: { title: "Alvenaria", is_visible: true } },
    { services: { title: "Serviço oculto", is_visible: false } },
    { services: null }
  ]), ["Alvenaria"]);
});

test("privileged service-link reads expose only published projects", () => {
  assert.deepEqual(publishedLinkedProjects([
    { projects: { slug: "publicado", is_published: true } },
    { projects: { slug: "rascunho", is_published: false } },
    { projects: null }
  ]), [{ slug: "publicado", is_published: true }]);
});
