"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeProjectCreation, createProjectForUpload } from "@/app/admin/(protected)/projetos/actions";
import { createClient } from "@/lib/supabase/client";
import { projectMediaUrl } from "@/lib/project-media";
import type { MediaUploadAttempt } from "@/lib/admin/media-upload";
import { uploadProjectMedia } from "@/lib/admin/upload-project-media";
import type { Database } from "@/types/supabase";
import { WorkspaceSubmit } from "./WorkspaceSubmit";
import { UploadFileProgress } from "./UploadFileProgress";
import { updateUploadFileState, type UploadFileProgressItem } from "@/lib/admin/upload-progress";

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
  const draftRef = useRef<{
    id: string;
    publishRequested: boolean;
    files: File[];
    altTexts: string[];
    uploaded: Set<number>;
    attempts: Map<number, MediaUploadAttempt>;
    coverUrl: string | null;
  } | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [photoAlts, setPhotoAlts] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fileProgress, setFileProgress] = useState<UploadFileProgressItem[]>([]);

  async function createWithPhotos(formData: FormData) {
    if (busy) return;
    const photos = draftRef.current?.files ?? Array.from(photosRef.current?.files ?? []);
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    if (photos.some((photo) => !allowedTypes.has(photo.type) || photo.size > 50 * 1024 * 1024)) {
      setMessage("Use imagens JPG, PNG, WebP ou AVIF de até 50 MB cada.");
      return;
    }
    const altTexts = draftRef.current?.altTexts ?? photos.map((_, index) => photoAlts[index]?.trim() ?? "");
    if (!draftRef.current && formData.get("is_published") === "on") {
      if (!photos.length) return setMessage("Selecione pelo menos uma imagem antes de publicar.");
      if (altTexts.some((alt) => alt.length < 5)) return setMessage("Descreva cada imagem antes de publicar.");
    }

    setBusy(true);
    setMessage(draftRef.current ? "A continuar o envio…" : "A criar projeto…");
    if (!draftRef.current) setFileProgress(photos.map(photo => ({ name: photo.name, state: "pending" })));
    let currentIndex: number | null = null;
    try {
      // The files are deliberately not in FormData: Server Actions have a small request limit.
      if (!draftRef.current) {
        const created = await createProjectForUpload(formData);
        if (!created.id) {
          setMessage(created.error ?? "Não foi possível criar o projeto.");
          return;
        }
        draftRef.current = {
          id: created.id,
          publishRequested: created.publishRequested ?? false,
          files: photos,
          altTexts,
          uploaded: new Set(),
          attempts: new Map(),
          coverUrl: null
        };
        setDraftId(created.id);
      }
      const draft = draftRef.current;

      const supabase = createClient();
      for (const [index, photo] of photos.entries()) {
        if (draft.uploaded.has(index)) continue;
        currentIndex = index;
        setFileProgress(items => updateUploadFileState(items, index, "uploading"));
        setMessage(`A enviar imagem ${index + 1} de ${photos.length}…`);
        const extension = photo.type === "image/jpeg" ? "jpg" : photo.type.split("/")[1];
        let attempt = draft.attempts.get(index);
        if (!attempt) {
          const id = crypto.randomUUID();
          attempt = { id, path: `${draft.id}/upload-${id}.${extension}`, started: false, storageUploaded: false };
          draft.attempts.set(index, attempt);
        }
        const url = projectMediaUrl(attempt.id);
        await uploadProjectMedia(supabase, attempt, photo, {
          project_id: draft.id,
          type: "image",
          url,
          alt_text: draft.altTexts[index],
          sort_order: index,
          before_after_group: null
        });
        draft.uploaded.add(index);
        setFileProgress(items => updateUploadFileState(items, index, "saved"));
        setUploadedCount(draft.uploaded.size);
        draft.coverUrl ??= url;
      }
      currentIndex = null;

      setMessage("A concluir projeto…");
      const completed = await completeProjectCreation(draft.id, draft.publishRequested, draft.coverUrl);
      if (completed.error) throw new Error(completed.error);
      router.replace(`/admin/projetos/${draft.id}?created=1`);
    } catch (error) {
      if (currentIndex !== null) {
        const index = currentIndex;
        setFileProgress(items => updateUploadFileState(items, index, "unconfirmed"));
      }
      const detail = error instanceof Error ? error.message : "Não foi possível concluir o envio das imagens.";
      const draft = draftRef.current;
      setMessage(draft
        ? `${detail} ${draft.uploaded.size} de ${draft.files.length} imagens guardadas. O projeto permanece como rascunho; tente novamente para continuar.`
        : detail);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={project ? action : undefined} onSubmit={project ? undefined : (event) => {
      // A handled upload failure must not trigger React's action-form reset.
      // Keep required fields and selected files available for the same draft retry.
      event.preventDefault();
      void createWithPhotos(new FormData(event.currentTarget));
    }} className="project-form">
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
          <label className="admin-field admin-field--file"><span>Fotografias do projeto</span><input ref={photosRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={!!draftId} onChange={(event) => {
            const names = Array.from(event.target.files ?? [], (file) => file.name);
            setPhotoCount(names.length);
            setPhotoNames(names);
            setPhotoAlts(names.map(() => ""));
            setFileProgress([]);
          }} /></label>
          <p>{photoCount ? `${photoCount} ${photoCount === 1 ? "imagem selecionada" : "imagens selecionadas"}. A primeira será a capa.` : "Selecione as imagens reais agora; serão enviadas e associadas ao projeto ao guardar."}</p>
          {!!photoNames.length && <div className="project-form__photo-alts">
            {photoNames.map((name, index) => <label className="admin-field" key={`${name}-${index}`}>
              <span>Descrição da imagem {index + 1}: {name}</span>
              <input value={photoAlts[index] ?? ""} onChange={(event) => setPhotoAlts((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} maxLength={180} disabled={!!draftId} placeholder="Descreva o que aparece na fotografia" />
            </label>)}
          </div>}
          {draftId && <p>{uploadedCount} de {photoCount} imagens guardadas neste rascunho. Os dados principais já foram guardados; edite-os no rascunho, se necessário.</p>}
          <UploadFileProgress items={fileProgress} />
          <small>JPG, PNG, WebP ou AVIF · até 50 MB por imagem. Para publicar agora, descreva cada fotografia.</small>
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
        {project ? <WorkspaceSubmit className="button button--bronze project-form__save">Salvar projeto</WorkspaceSubmit> : <button className="button button--bronze project-form__save" type="submit" disabled={busy} aria-busy={busy}>{busy ? "A guardar…" : draftId ? "Tentar novamente" : "Guardar projeto e imagens"}</button>}
        {!project && message && <p className="project-form__status" role="status" aria-live="polite">{message}</p>}
        {!project && draftId && <a href={`/admin/projetos/${draftId}`}>Abrir rascunho e completar manualmente</a>}
      </aside>
    </form>
  );
}
