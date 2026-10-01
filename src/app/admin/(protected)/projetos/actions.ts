"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { PRIVATE_PROJECT_MEDIA_BUCKET } from "@/lib/project-media";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const projectSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(140),
  city: optionalText(100),
  category: optionalText(100),
  summary: z.string().trim().max(500),
  content: z.string().trim().max(12000),
  duration: optionalText(100),
  video_url: z.union([z.literal(""), z.url().max(1000)]).transform((value) => value || null),
  seo_title: optionalText(70),
  seo_description: optionalText(170),
  is_published: z.boolean(),
  service_ids: z.array(z.uuid()).max(30)
});

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140);
}

function parseProject(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  return projectSchema.safeParse({
    title,
    slug: slugify(String(formData.get("slug") ?? "") || title),
    city: String(formData.get("city") ?? ""),
    category: String(formData.get("category") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    content: String(formData.get("content") ?? ""),
    duration: String(formData.get("duration") ?? ""),
    video_url: String(formData.get("video_url") ?? ""),
    seo_title: String(formData.get("seo_title") ?? ""),
    seo_description: String(formData.get("seo_description") ?? ""),
    is_published: formData.get("is_published") === "on",
    service_ids: formData.getAll("service_ids").map(String)
  });
}

function revalidateProjects(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/projetos");
  revalidatePath("/projetos");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/projetos/${slug}`);
}

export async function createProjectForUpload(formData: FormData) {
  const parsed = parseProject(formData);
  if (!parsed.success || !parsed.data.slug) return { error: "Revise os campos obrigatórios." };

  const { service_ids, is_published, ...project } = parsed.data;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("projects").insert({ ...project, is_published: false }).select("id").single();

  if (error || !data) {
    const message = error?.code === "23505" ? "Este endereço já está em uso. Escolha outro slug." : "Não foi possível criar o projeto.";
    return { error: message };
  }

  let warning: string | undefined;
  if (service_ids.length) {
    const { error: servicesError } = await supabase.from("project_services").insert(
      service_ids.map((service_id) => ({ project_id: data.id, service_id }))
    );
    if (servicesError) warning = "Projeto criado, mas os serviços não foram associados.";
  }

  revalidateProjects(project.slug);
  return { id: data.id, publishRequested: is_published, warning };
}

export async function completeProjectCreation(projectId: string, publish: boolean, coverUrl: string | null) {
  const id = z.uuid().safeParse(projectId);
  if (!id.success) return { error: "Identificador do projeto inválido." };
  const { supabase } = await requireAdmin();

  if (coverUrl) {
    const { data: cover, error: coverError } = await supabase.from("project_media")
      .select("id").eq("project_id", id.data).eq("url", coverUrl).eq("type", "image").maybeSingle();
    if (coverError || !cover) return { error: "As imagens foram enviadas, mas a capa não foi encontrada." };
  }

  const { data, error } = await supabase.from("projects")
    .update({ hero_image: coverUrl, is_published: publish })
    .eq("id", id.data).select("slug").single();
  if (error || !data) return { error: "Projeto criado, mas não foi possível concluir a publicação." };
  revalidateProjects(data.slug);
  return { success: true };
}

export async function updateProject(projectId: string, formData: FormData) {
  const id = z.uuid().safeParse(projectId);
  const parsed = parseProject(formData);
  if (!id.success || !parsed.success || !parsed.data.slug) redirect(`/admin/projetos/${projectId}?error=Revise+os+campos+do+projeto.`);

  const { service_ids, ...project } = parsed.data;
  const { supabase } = await requireAdmin();
  const { data: previous } = await supabase.from("projects").select("slug").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("projects").update(project).eq("id", id.data);

  if (error) {
    const message = error.code === "23505" ? "Este endereço já está em uso. Escolha outro slug." : "Não foi possível salvar o projeto.";
    redirect(`/admin/projetos/${id.data}?error=${encodeURIComponent(message)}`);
  }

  const { error: clearError } = await supabase.from("project_services").delete().eq("project_id", id.data);
  if (clearError) redirect(`/admin/projetos/${id.data}?error=O+projeto+foi+salvo,+mas+os+serviços+não.`);
  if (service_ids.length) {
    const { error: servicesError } = await supabase.from("project_services").insert(
      service_ids.map((service_id) => ({ project_id: id.data, service_id }))
    );
    if (servicesError) redirect(`/admin/projetos/${id.data}?error=O+projeto+foi+salvo,+mas+os+serviços+não.`);
  }

  revalidateProjects(previous?.slug);
  revalidateProjects(project.slug);
  redirect(`/admin/projetos/${id.data}?saved=1`);
}

export async function toggleProjectPublished(projectId: string, publish: boolean) {
  const id = z.uuid().safeParse(projectId);
  if (!id.success) redirect("/admin/projetos?error=Projeto+inválido.");
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("projects").update({ is_published: publish }).eq("id", id.data).select("slug").single();
  if (error || !data) redirect("/admin/projetos?error=Não+foi+possível+alterar+a+publicação.");
  revalidateProjects(data.slug);
  redirect("/admin/projetos?updated=1");
}

export async function deleteProject(projectId: string) {
  const id = z.uuid().safeParse(projectId);
  if (!id.success) return;
  const { supabase } = await requireAdmin();
  const { data: project } = await supabase.from("projects").select("slug").eq("id", id.data).maybeSingle();
  for (const bucket of ["project-media", PRIVATE_PROJECT_MEDIA_BUCKET]) {
    const { data: files, error: listError } = await supabase.storage.from(bucket).list(id.data, { limit: 1000 });
    if (listError) throw new Error("Não foi possível verificar os arquivos do projeto.");
    if (files?.length) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(files.map((file) => `${id.data}/${file.name}`));
      if (removeError) throw new Error("Não foi possível remover todos os arquivos do projeto.");
    }
  }
  const { error } = await supabase.from("projects").delete().eq("id", id.data);
  if (error) throw new Error("Não foi possível excluir o projeto.");
  revalidateProjects(project?.slug);
  redirect("/admin/projetos?deleted=1");
}
