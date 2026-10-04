/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProjectMediaAlt } from "@/app/admin/(protected)/projetos/actions";
import { createClient } from "@/lib/supabase/client";
import { PRIVATE_PROJECT_MEDIA_BUCKET, projectMediaUrl } from "@/lib/project-media";
import type { MediaUploadAttempt } from "@/lib/admin/media-upload";
import { uploadProjectMedia } from "@/lib/admin/upload-project-media";
import type { Database } from "@/types/supabase";
import { WorkspaceSubmit } from "./WorkspaceSubmit";

type Media = Database["public"]["Tables"]["project_media"]["Row"];
type MediaType = "image" | "video" | "before" | "after";
type UploadSession = {
  files: File[];
  uploaded: Set<number>;
  attempts: Map<number, MediaUploadAttempt>;
  nextOrder: number;
  firstImageUrl: string | null;
  mediaType: MediaType;
  altTexts: string[];
  group: string;
};
const allowedFileTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"]);

function storagePath(url: string) {
  const marker = "/project-media/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

export function ProjectMediaManager({ projectId, initialMedia, heroImage }: { projectId: string; initialMedia: Media[]; heroImage: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadSessionRef = useRef<UploadSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retryPending, setRetryPending] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [selectedFiles, setSelectedFiles] = useState<Array<{ name: string; type: string }>>([]);
  const [altDrafts, setAltDrafts] = useState<string[]>([]);
  const [group, setGroup] = useState("");

  async function upload() {
    if (busy) return;
    const files = uploadSessionRef.current?.files ?? Array.from(inputRef.current?.files ?? []);
    if (!files.length) return setMessage("Selecione pelo menos um arquivo.");
    if (files.some((file) => file.size > 50 * 1024 * 1024)) return setMessage("Cada arquivo pode ter no máximo 50 MB.");
    if (files.some((file) => !allowedFileTypes.has(file.type))) return setMessage("Use imagens JPG, PNG, WebP ou AVIF, ou vídeos MP4/WebM.");
    const altTexts = uploadSessionRef.current?.altTexts ?? files.map((_, index) => altDrafts[index]?.trim() ?? "");
    if (files.some((file, index) => !file.type.startsWith("video/") && altTexts[index].length < 5)) {
      return setMessage("Descreva cada imagem em pelo menos 5 caracteres antes de enviar.");
    }

    setBusy(true);
    setMessage(uploadSessionRef.current ? "A continuar o envio…" : "A enviar arquivos…");
    const supabase = createClient();
    if (!uploadSessionRef.current) {
      uploadSessionRef.current = {
        files,
        uploaded: new Set(),
        attempts: new Map(),
        nextOrder: initialMedia.reduce((max, item) => Math.max(max, item.sort_order), -1) + 1,
        firstImageUrl: null,
        mediaType,
        altTexts,
        group: group.trim()
      };
    }
    const session = uploadSessionRef.current;

    try {
      for (const [index, file] of session.files.entries()) {
        if (session.uploaded.has(index)) continue;
        setMessage(`A enviar arquivo ${index + 1} de ${session.files.length}…`);
        const isVideo = file.type.startsWith("video/");
        const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
        let attempt = session.attempts.get(index);
        if (!attempt) {
          const id = crypto.randomUUID();
          attempt = { id, path: `${projectId}/upload-${id}.${extension}`, started: false, storageUploaded: false };
          session.attempts.set(index, attempt);
        }
        const url = projectMediaUrl(attempt.id);
        const type: MediaType = isVideo ? "video" : session.mediaType;
        await uploadProjectMedia(supabase, attempt, file, {
          project_id: projectId,
          type,
          url,
          alt_text: session.altTexts[index],
          sort_order: session.nextOrder,
          before_after_group: type === "before" || type === "after" ? session.group || "comparativo-1" : null
        });
        session.uploaded.add(index);
        session.nextOrder += 1;
        if (!isVideo && !session.firstImageUrl) session.firstImageUrl = url;
      }

      if (!heroImage && session.firstImageUrl) {
        const { error: coverError } = await supabase.from("projects")
          .update({ hero_image: session.firstImageUrl }).eq("id", projectId).select("id").single();
        if (coverError) throw new Error("Arquivos guardados, mas não foi possível definir a capa.");
      }
      setMessage(`${session.uploaded.size} ${session.uploaded.size === 1 ? "arquivo enviado" : "arquivos enviados"} com sucesso.`);
      uploadSessionRef.current = null;
      setRetryPending(false);
      if (inputRef.current) inputRef.current.value = "";
      setSelectedFiles([]);
      setAltDrafts([]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Não foi possível concluir o envio.";
      setMessage(`${detail} ${session.uploaded.size} de ${session.files.length} arquivos guardados. Tente novamente para continuar sem duplicar os já enviados.`);
      setRetryPending(true);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function remove(item: Media) {
    if (!window.confirm("Remover este arquivo do projeto?")) return;
    setBusy(true);
    const supabase = createClient();
    const wasCover = heroImage === item.url;
    if (wasCover) {
      const { error: coverError } = await supabase.from("projects").update({ hero_image: null }).eq("id", projectId);
      if (coverError) { setMessage("Não foi possível remover a capa."); setBusy(false); return; }
    }
    const { error } = await supabase.from("project_media").delete().eq("id", item.id).eq("project_id", projectId).select("id").single();
    if (error) {
      const { error: restoreError } = wasCover
        ? await supabase.from("projects").update({ hero_image: item.url }).eq("id", projectId)
        : { error: null };
      setMessage(restoreError
        ? "Não foi possível remover o arquivo nem restaurar a capa. Contacte o suporte."
        : wasCover ? "Não foi possível remover o arquivo. A capa foi restaurada." : "Não foi possível remover o arquivo.");
      setBusy(false);
      router.refresh();
      return;
    }
    const path = item.storage_path ?? storagePath(item.url);
    const bucket = item.storage_path ? PRIVATE_PROJECT_MEDIA_BUCKET : "project-media";
    const { error: storageError } = path ? await supabase.storage.from(bucket).remove([path]) : { error: null };
    setMessage(storageError ? "Registro removido, mas a limpeza do arquivo falhou. Contacte o suporte." : "Arquivo removido.");
    setBusy(false);
    router.refresh();
  }

  async function setCover(url: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("projects").update({ hero_image: url }).eq("id", projectId);
    setMessage(error ? "Não foi possível alterar a capa." : "Imagem de capa atualizada.");
    setBusy(false);
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const current = initialMedia[index];
    if (!initialMedia[index + direction] || !current) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("swap_project_media_order", {
      p_project_id: projectId,
      p_media_id: current.id,
      p_direction: direction
    });
    setMessage(error || !data ? "Não foi possível reordenar." : "Ordem atualizada.");
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="admin-panel project-media">
      <div className="admin-panel__heading"><div><span>IMAGENS E VÍDEOS</span><h2>Galeria do projeto</h2></div></div>
      <div className="project-media__upload">
        <label className="admin-field admin-field--file"><span>Arquivos</span><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" multiple disabled={retryPending || busy} onChange={(event) => {
          const selected = Array.from(event.target.files ?? [], (file) => ({ name: file.name, type: file.type }));
          setSelectedFiles(selected);
          setAltDrafts(selected.map(() => ""));
        }} /></label>
        <label className="admin-field"><span>Tipo</span><select value={mediaType} onChange={(event) => setMediaType(event.target.value as MediaType)} disabled={retryPending || busy}><option value="image">Imagem</option><option value="before">Antes</option><option value="after">Depois</option></select></label>
        {!!selectedFiles.length && <div className="project-media__alt-inputs">
          {selectedFiles.map((file, index) => !file.type.startsWith("video/") && <label className="admin-field" key={`${file.name}-${index}`}>
            <span>Descrição da imagem {index + 1}: {file.name}</span>
            <input value={altDrafts[index] ?? ""} onChange={(event) => setAltDrafts((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} maxLength={180} disabled={retryPending || busy} placeholder="Descreva o que aparece na fotografia" />
          </label>)}
        </div>}
        {(mediaType === "before" || mediaType === "after") && <label className="admin-field"><span>Grupo comparativo</span><input value={group} onChange={(event) => setGroup(event.target.value)} maxLength={80} placeholder="Ex.: fachada" disabled={retryPending || busy} /></label>}
        <button type="button" onClick={upload} disabled={busy}>{busy ? "Enviando…" : retryPending ? "Tentar novamente" : "Enviar arquivos"}</button>
        {message && <p role={retryPending ? "alert" : "status"}>{message}</p>}
      </div>
      {initialMedia.length ? (
        <div className="project-media__grid">
          {initialMedia.map((item, index) => (
            <article key={item.id} className={heroImage === item.url ? "is-cover" : ""}>
              <div className="project-media__preview">
                {item.type === "video" ? <video src={item.url} controls playsInline preload="metadata" /> : <img src={item.url} alt={item.alt_text || "Mídia do projeto"} width={1600} height={1000} loading="lazy" decoding="async" />}
                <span>{heroImage === item.url ? "CAPA" : item.type.toUpperCase()}</span>
              </div>
              <p>{item.alt_text || "Sem texto alternativo"}</p>
              {item.type !== "video" && <form action={updateProjectMediaAlt.bind(null, projectId, item.id)} className="project-media__alt-editor">
                <label className="admin-field"><span>Texto alternativo</span><input name="alt_text" defaultValue={item.alt_text} minLength={5} maxLength={180} required aria-label={`Descrição da imagem ${index + 1}`} /></label>
                <WorkspaceSubmit disabled={busy}>Guardar descrição</WorkspaceSubmit>
              </form>}
              <div className="project-media__actions">
                <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label="Mover para trás">←</button>
                <button type="button" onClick={() => move(index, 1)} disabled={busy || index === initialMedia.length - 1} aria-label="Mover para frente">→</button>
                {item.type !== "video" && heroImage !== item.url && <button type="button" onClick={() => setCover(item.url)} disabled={busy}>Usar como capa</button>}
                <button type="button" onClick={() => remove(item)} disabled={busy}>Remover</button>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="admin-empty"><span>SEM MÍDIA</span><h3>A galeria está vazia.</h3><p>Envie somente fotos e vídeos reais desta obra.</p></div>}
    </section>
  );
}
