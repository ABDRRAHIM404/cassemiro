"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { PRIVATE_PROJECT_MEDIA_BUCKET } from "@/lib/project-media";
import { projectServiceLinkChanges } from "@/lib/project-service-links";

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

async function publicationMediaError(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  projectId: string
) {
  const { data, error } = await supabase.from("project_media")
    .select("type, alt_text").eq("project_id", projectId);
  if (error) return "Não foi possível verificar as imagens do projeto.";
  const images = (data ?? []).filter((item) => item.type !== "video");
  if (!images.length) return "Adicione uma imagem real antes de publicar.";
  if (images.some((item) => item.alt_text.trim().length < 5)) {
    return "Descreva todas as imagens na galeria antes de publicar.";
  }
  return null;
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
  if (publish) {
    const mediaError = await publicationMediaError(supabase, id.data);
    if (mediaError) return { error: `${mediaError} O projeto permanece como rascunho.` };
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
  const { data: previous } = await supabase.from("projects").select("slug, is_published").eq("id", id.data).maybeSingle();
  const { data: currentLinks, error: linksReadError } = await supabase.from("project_services")
    .select("service_id").eq("project_id", id.data);
  if (linksReadError) redirect(`/admin/projetos/${id.data}?error=Não+foi+possível+verificar+os+serviços+atuais.`);
  const { added, removed } = projectServiceLinkChanges(
    (currentLinks ?? []).map((link) => link.service_id), service_ids
  );
  if (project.is_published && !previous?.is_published) {
    const mediaError = await publicationMediaError(supabase, id.data);
    if (mediaError) redirect(`/admin/projetos/${id.data}?error=${encodeURIComponent(mediaError)}`);
  }
  const { error } = await supabase.from("projects").update(project).eq("id", id.data);

  if (error) {
    const message = error.code === "23505" ? "Este endereço já está em uso. Escolha outro slug." : "Não foi possível salvar o projeto.";
    redirect(`/admin/projetos/${id.data}?error=${encodeURIComponent(message)}`);
  }

  // Add before removing old links so an insert failure cannot erase the previous set.
  if (added.length) {
    const { error: servicesError } = await supabase.from("project_services").insert(
      added.map((service_id) => ({ project_id: id.data, service_id }))
    );
    if (servicesError) redirect(`/admin/projetos/${id.data}?error=O+projeto+foi+salvo,+mas+os+serviços+não.`);
  }
  if (removed.length) {
    const { error: removeError } = await supabase.from("project_services")
      .delete().eq("project_id", id.data).in("service_id", removed);
    if (removeError) redirect(`/admin/projetos/${id.data}?error=O+projeto+foi+salvo,+mas+os+serviços+não.`);
  }

  revalidateProjects(previous?.slug);
  revalidateProjects(project.slug);
  redirect(`/admin/projetos/${id.data}?saved=1`);
}

export async function toggleProjectPublished(projectId: string, publish: boolean) {
  const id = z.uuid().safeParse(projectId);
  if (!id.success) redirect("/admin/projetos?error=Projeto+inválido.");
  const { supabase } = await requireAdmin();
  if (publish) {
    const mediaError = await publicationMediaError(supabase, id.data);
    if (mediaError) redirect(`/admin/projetos?error=${encodeURIComponent(mediaError)}`);
  }
  const { data, error } = await supabase.from("projects").update({ is_published: publish }).eq("id", id.data).select("slug").single();
  if (error || !data) redirect("/admin/projetos?error=Não+foi+possível+alterar+a+publicação.");
  revalidateProjects(data.slug);
  redirect("/admin/projetos?updated=1");
}

export async function updateProjectMediaAlt(projectId: string, mediaId: string, formData: FormData) {
  const project = z.uuid().safeParse(projectId);
  const media = z.uuid().safeParse(mediaId);
  const altText = z.string().trim().min(5).max(180).safeParse(String(formData.get("alt_text") ?? ""));
  if (!project.success || !media.success || !altText.success) {
    redirect(`/admin/projetos/${projectId}?error=${encodeURIComponent("Descreva a imagem em 5 a 180 caracteres.")}`);
  }

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("project_media")
    .update({ alt_text: altText.data })
    .eq("id", media.data).eq("project_id", project.data).neq("type", "video")
    .select("id").single();
  if (error || !data) redirect(`/admin/projetos/${project.data}?error=Não+foi+possível+guardar+a+descrição+da+imagem.`);
  const { data: savedProject } = await supabase.from("projects").select("slug").eq("id", project.data).maybeSingle();
  revalidateProjects(savedProject?.slug);
  redirect(`/admin/projetos/${project.data}?alt=1`);
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
