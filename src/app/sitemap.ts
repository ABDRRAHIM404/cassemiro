import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { createPublicClient } from "@/lib/supabase/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const [{ data: projects }, { data: services }] = await Promise.all([
    supabase.from("projects").select("slug, updated_at").eq("is_published", true),
    supabase.from("services").select("slug, updated_at").eq("is_visible", true)
  ]);
  const projectRoutes: MetadataRoute.Sitemap = (projects ?? []).map((project) => ({
    url: `${siteConfig.siteUrl}/projetos/${project.slug}`,
    lastModified: project.updated_at,
    changeFrequency: "monthly",
    priority: .7
  }));
  const serviceRoutes: MetadataRoute.Sitemap = (services ?? []).map((service) => ({
    url: `${siteConfig.siteUrl}/servicos/${service.slug}`,
    lastModified: service.updated_at,
    changeFrequency: "monthly",
    priority: .8
  }));

  return [
    { url: siteConfig.siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.siteUrl}/contato`, changeFrequency: "yearly", priority: .8 },
    { url: `${siteConfig.siteUrl}/servicos`, changeFrequency: "monthly", priority: .9 },
    ...serviceRoutes,
    ...(projects?.length ? [{ url: `${siteConfig.siteUrl}/projetos`, changeFrequency: "monthly" as const, priority: .8 }] : []),
    ...projectRoutes,
    { url: `${siteConfig.siteUrl}/politica-de-privacidade`, changeFrequency: "yearly", priority: .2 }
  ];
}
