import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteProjectButton } from "@/components/admin/DeleteProjectButton";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { ProjectMediaManager } from "@/components/admin/ProjectMediaManager";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateProject } from "../actions";

type Params = { id: string };

export default async function EditProjectPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ saved?: string; created?: string; alt?: string; error?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const [projectResult, mediaResult, servicesResult, selectedResult] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("project_media").select("*").eq("project_id", id).order("sort_order"),
    supabase.from("services").select("id, title").order("sort_order"),
    supabase.from("project_services").select("service_id").eq("project_id", id)
  ]);
  if (!projectResult.data) notFound();
  const project = projectResult.data;
  const media = mediaResult.data ?? [];
  const missingAltCount = media.filter((item) => item.type !== "video" && item.alt_text.trim().length < 5).length;

  return (
    <main id="conteudo" className="admin-content">
      <Link href="/admin/projetos" className="admin-back">← Voltar aos projetos</Link>
      <div className="admin-page-heading admin-page-heading--detail">
        <div><p className="eyebrow eyebrow--dark">Editar projeto</p><h1>{project.title}</h1></div>
        <span className={`status status--large ${project.is_published ? "status--published" : "status--draft"}`}>{project.is_published ? "Publicado" : "Oculto"}</span>
      </div>
      {(query.saved === "1" || query.created === "1") && <div className="admin-notice">{query.created === "1" ? "Projeto e imagens guardados. Pode gerir a galeria abaixo." : "Alterações salvas."}</div>}
      {query.alt === "1" && <div className="admin-notice">Descrição da imagem guardada.</div>}
      {query.error && <div className="admin-alert" role="alert">{query.error}</div>}
      {missingAltCount > 0 && <div className="admin-alert" role="status">{missingAltCount} {missingAltCount === 1 ? "imagem precisa" : "imagens precisam"} de descrição. Complete o texto alternativo na galeria abaixo.</div>}
      <ProjectForm action={updateProject.bind(null, project.id)} project={project} services={servicesResult.data ?? []} selectedServices={(selectedResult.data ?? []).map((item) => item.service_id)} />
      <ProjectMediaManager projectId={project.id} initialMedia={media} heroImage={project.hero_image} />
      <section className="admin-delete-zone"><div><strong>Excluir projeto</strong><p>Remove permanentemente o cadastro e todos os arquivos enviados.</p></div><DeleteProjectButton projectId={project.id} title={project.title} /></section>
    </main>
  );
}
