import { requireAdmin } from "@/lib/auth/require-admin";
import { PRIVATE_PROJECT_MEDIA_BUCKET } from "@/lib/project-media";
import { interruptedMediaIdentity, isInterruptedUploadOldEnough } from "@/lib/admin/interrupted-media";
import { recoverInterruptedProjectMedia } from "@/app/admin/(protected)/projetos/actions";
import { WorkspaceSubmit } from "./WorkspaceSubmit";

export async function InterruptedProjectUploads({ projectId }: { projectId: string }) {
  const { supabase } = await requireAdmin();
  const files = [];
  let capped = false;
  // Explicit, bounded scan of this project's private folder; never a bucket-wide
  // listing or cleanup. Recover actions recheck every identity and object.
  for (let offset = 0; offset < 1000; offset += 100) {
    const result = await supabase.storage.from(PRIVATE_PROJECT_MEDIA_BUCKET).list(projectId, {
      limit: 100, offset, sortBy: { column: "name", order: "asc" },
    });
    if (result.error) return <div className="admin-alert" role="alert">Não foi possível verificar os arquivos. Nenhum arquivo foi alterado.</div>;
    files.push(...result.data);
    if (result.data.length < 100) break;
    if (offset === 900) capped = true;
  }
  const paths = files.filter(file => file.id).map(file => `${projectId}/${file.name}`);
  const registered = new Set<string>();
  for (let offset = 0; offset < paths.length; offset += 100) {
    const result = await supabase.from("project_media").select("storage_path").in("storage_path", paths.slice(offset, offset + 100));
    if (result.error) return <div className="admin-alert" role="alert">Não foi possível confirmar a galeria. Nenhum arquivo foi alterado.</div>;
    for (const row of result.data) if (row.storage_path) registered.add(row.storage_path);
  }
  const unregistered = files.filter(file => file.id && !registered.has(`${projectId}/${file.name}`));
  const recoverable = unregistered.filter(file => interruptedMediaIdentity(projectId, `${projectId}/${file.name}`)
    && isInterruptedUploadOldEnough(file.updated_at));
  const previews = recoverable.length ? await supabase.storage.from(PRIVATE_PROJECT_MEDIA_BUCKET)
    .createSignedUrls(recoverable.map(file => `${projectId}/${file.name}`), 300) : null;
  const previewUrls = new Map(previews?.data?.map(preview => [preview.path, preview.signedUrl]) ?? []);
  return <section className="admin-panel" aria-labelledby="interrupted-uploads-title">
    <div className="admin-panel__heading"><div><h2 id="interrupted-uploads-title">Envios interrompidos</h2>
      <p>Arquivos privados enviados há pelo menos 10 minutos, mas ainda fora da galeria. Nenhum arquivo é excluído automaticamente. Confira o arquivo antes de adicionar; ele seguirá a visibilidade atual deste projeto.</p></div></div>
    {capped && <p role="status">Verificação limitada aos primeiros 1.000 arquivos. Contacte o suporte para verificar o restante.</p>}
    {!recoverable.length && <p>Nenhum envio recuperável encontrado.</p>}
    {unregistered.length > recoverable.length && <p role="status">Há {unregistered.length - recoverable.length} arquivo(s) recente(s) ou antigo(s) sem identidade recuperável. Aguarde 10 minutos ou contacte o suporte; eles foram preservados.</p>}
    {recoverable.map(file => <form key={file.name} action={recoverInterruptedProjectMedia.bind(null, projectId, `${projectId}/${file.name}`)} className="project-media__alt-editor">
      <p style={{ overflowWrap: "anywhere" }}>Arquivo: {file.name}</p>
      {previewUrls.get(`${projectId}/${file.name}`) && <a href={previewUrls.get(`${projectId}/${file.name}`) ?? undefined} target="_blank" rel="noreferrer">Conferir arquivo privado (link válido por 5 minutos)</a>}
      <label className="admin-field"><span>Descrição do arquivo</span><input name="alt_text" required minLength={5} maxLength={180} placeholder="Confirme qual registro da obra deseja recuperar" /></label>
      {!/\.(mp4|webm)$/i.test(file.name) && <>
        <label className="admin-field"><span>Tipo de imagem</span><select name="media_type" defaultValue="image"><option value="image">Imagem</option><option value="before">Antes</option><option value="after">Depois</option></select></label>
        <label className="admin-field"><span>Grupo comparativo (para Antes/Depois)</span><input name="before_after_group" maxLength={80} placeholder="Ex.: fachada" /></label>
      </>}
      <WorkspaceSubmit>Adicionar à galeria sem reenviar</WorkspaceSubmit>
    </form>)}
  </section>;
}
