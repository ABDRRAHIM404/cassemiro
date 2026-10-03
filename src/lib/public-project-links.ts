import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { publishedLinkedProjects, visibleServiceTitles } from "@/lib/public-project-links-filter";

export async function getVisibleServicesForProject(projectId: string) {
  const supabase = createPublicClient({ noStore: true });

  const result = await supabase.from("project_services")
    .select("services(title, is_visible)")
    .eq("project_id", projectId);
  const links = requirePublicData(result, "project services");
  return visibleServiceTitles(links ?? []);
}

export async function getPublishedProjectsForService(serviceId: string) {
  const supabase = createPublicClient({ noStore: true });

  const result = await supabase.from("project_services")
    .select("projects(slug, title, city, summary, hero_image, is_published)")
    .eq("service_id", serviceId);
  const links = requirePublicData(result, "related service projects");
  return publishedLinkedProjects(links ?? []);
}
