"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeProjectCreation, createProjectForUpload } from "@/app/admin/(protected)/projetos/actions";
import { createClient } from "@/lib/supabase/client";
import { PRIVATE_PROJECT_MEDIA_BUCKET, projectMediaUrl } from "@/lib/project-media";
import type { Database } from "@/types/supabase";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Service = Pick<Database["public"]["Tables"]["services"]["Row"], "id" | "title">;

export function ProjectForm({
  action,
  project,
  services,
  selectedServices = []
}: {
  action?: (formData: FormData) => void | Promise<void>;
  project?: Project;
  services: Service[];
  selectedServices?: string[];
}) {
  const router = useRouter();
  const photosRef = useRef<HTMLInputElement>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createWithPhotos(formData: FormData) {
    if (busy) return;
    const photos = Array.from(photosRef.current?.files ?? []);
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    if (photos.some((photo) => !allowedTypes.has(photo.type) || photo.size > 50 * 1024 * 1024)) {
      setMessage("Use imagens JPG, PNG, WebP ou AVIF de até 50 MB cada.");
      return;
    }

    setBusy(true);
    setMessage("A criar projeto…");
    let projectId: string | undefined;

    try {
      // The files are deliberately not in FormData: Server Actions have a small request limit.
      const created = await createProjectForUpload(formData);
      if (!created.id) {
        setMessage(created.error ?? "Não foi possível criar o projeto.");
        return;
      }
      projectId = created.id;

      const supabase = createClient();
      let coverUrl: string | null = null;
      for (const [index, photo] of photos.entries()) {
        setMessage(`A enviar imagem ${index + 1} de ${photos.length}…`);
        const extension = photo.type === "image/jpeg" ? "jpg" : photo.type.split("/")[1];
        const path = `${projectId}/${crypto.randomUUID()}.${extension}`;
        const mediaId = crypto.randomUUID();
        const { error: uploadError } = await supabase.storage.from(PRIVATE_PROJECT_MEDIA_BUCKET)
          .upload(path, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw new Error(`Não foi possível enviar ${photo.name}.`);

        const url = projectMediaUrl(mediaId);
        const { error: recordError } = await supabase.from("project_media").insert({
          id: mediaId,
          project_id: projectId,
          type: "image",
          url,
          storage_path: path,
          alt_text: "",
          sort_order: index,
          before_after_group: null
        });
        if (recordError) {
          await supabase.storage.from(PRIVATE_PROJECT_MEDIA_BUCKET).remove([path]);
          throw new Error(`Não foi possível guardar ${photo.name} na galeria.`);
        }
        coverUrl ??= url;
      }

      setMessage("A concluir projeto…");
      const completed = await completeProjectCreation(projectId, created.publishRequested ?? false, coverUrl);
      const warning = [created.warning, completed.error].filter(Boolean).join(" ");
      router.replace(`/admin/projetos/${projectId}?${warning ? `error=${encodeURIComponent(warning)}` : "created=1"}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Não foi possível concluir o envio das imagens.";
      if (projectId) {
        router.replace(`/admin/projetos/${projectId}?error=${encodeURIComponent(`${detail} O projeto foi guardado como rascunho; pode enviar as restantes imagens aqui.`)}`);
      } else {
        setMessage(detail);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={project ? action : createWithPhotos} className="project-form">
      <section className="admin-panel project-form__main">
        <div className="admin-panel__heading"><div><span>DADOS PRINCIPAIS</span><h2>Apresentação do projeto</h2></div></div>
        <div className="project-form__fields">
          <label className="admin-field admin-field--full"><span>Título *</span><input name="title" defaultValue={project?.title} maxLength={120} required /></label>
          <label className="admin-field"><span>Slug</span><input name="slug" defaultValue={project?.slug} maxLength={140} placeholder="gerado a partir do título" /></label>
          <label className="admin-field"><span>Cidade</span><input name="city" defaultValue={project?.city ?? ""} maxLength={100} /></label>
          <label className="admin-field"><span>Categoria</span><input name="category" defaultValue={project?.category ?? ""} maxLength={100} placeholder="Ex.: Construção residencial" /></label>
          <label className="admin-field"><span>Duração</span><input name="duration" defaultValue={project?.duration ?? ""} maxLength={100} placeholder="Ex.: 10 meses" /></label>
          <label className="admin-field admin-field--full"><span>Resumo</span><textarea name="summary" defaultValue={project?.summary} maxLength={500} rows={4} /></label>
          <label className="admin-field admin-field--full"><span>Descrição completa</span><textarea name="content" defaultValue={project?.content} maxLength={12000} rows={12} /></label>
          <label className="admin-field admin-field--full"><span>URL de vídeo externo</span><input name="video_url" type="url" defaultValue={project?.video_url ?? ""} placeholder="https://…" /></label>
        </div>
        {!project && <div className="project-form__photos">
          <label className="admin-field admin-field--file"><span>Fotografias do projeto</span><input ref={photosRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => setPhotoCount(event.target.files?.length ?? 0)} /></label>
          <p>{photoCount ? `${photoCount} ${photoCount === 1 ? "imagem selecionada" : "imagens selecionadas"}. A primeira será a capa.` : "Selecione as imagens reais agora; serão enviadas e associadas ao projeto ao guardar."}</p>
          <small>JPG, PNG, WebP ou AVIF · até 50 MB por imagem.</small>
        </div>}
      </section>

      <aside className="project-form__side">
        <section className="admin-panel project-form__box">
          <span>PUBLICAÇÃO</span>
          <label className="admin-check"><input name="is_published" type="checkbox" defaultChecked={project?.is_published ?? false} /><span>Projeto publicado</span></label>
          <p>Somente publique quando os textos e as imagens reais estiverem prontos.</p>
        </section>
        <section className="admin-panel project-form__box">
          <span>SERVIÇOS REALIZADOS</span>
          <div className="project-form__checks">
            {services.map((service) => <label className="admin-check" key={service.id}><input name="service_ids" type="checkbox" value={service.id} defaultChecked={selectedServices.includes(service.id)} /><span>{service.title}</span></label>)}
          </div>
        </section>
        <section className="admin-panel project-form__box">
          <span>SEO</span>
          <label className="admin-field"><span>Título para busca</span><input name="seo_title" defaultValue={project?.seo_title ?? ""} maxLength={70} /></label>
          <label className="admin-field"><span>Descrição para busca</span><textarea name="seo_description" defaultValue={project?.seo_description ?? ""} maxLength={170} rows={4} /></label>
        </section>
        <button className="button button--bronze project-form__save" type="submit" disabled={busy}>{busy ? "A guardar…" : project ? "Salvar projeto" : "Guardar projeto e imagens"}</button>
        {!project && message && <p className="project-form__status" role="status" aria-live="polite">{message}</p>}
      </aside>
    </form>
  );
}
