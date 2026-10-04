import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { PRIVATE_PROJECT_MEDIA_BUCKET } from "@/lib/project-media";
import { persistMediaUpload, type MediaUploadAttempt } from "./media-upload";

type MediaInsert = Database["public"]["Tables"]["project_media"]["Insert"];

export async function uploadProjectMedia(
  supabase: SupabaseClient<Database>, attempt: MediaUploadAttempt, file: File, record: MediaInsert
): Promise<void> {
  const bucket = supabase.storage.from(PRIVATE_PROJECT_MEDIA_BUCKET);
  await persistMediaUpload(attempt, {
    recordExists: async () => {
      const { data, error } = await supabase.from("project_media")
        .select("id,project_id,storage_path").eq("id", attempt.id).maybeSingle();
      if (error) throw new Error(`Não foi possível confirmar ${file.name}. O arquivo foi preservado; tente novamente.`);
      if (!data) return false;
      if (data.project_id !== record.project_id || data.storage_path !== attempt.path) {
        throw new Error("O registro encontrado não corresponde ao envio. Contacte o suporte.");
      }
      return true;
    },
    uploadObject: async () => {
      const { error } = await bucket.upload(attempt.path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(`Não foi possível enviar ${file.name}.`);
    },
    objectExists: async () => {
      const { data, error } = await bucket.info(attempt.path);
      return !error && !!data && data.size === file.size;
    },
    insertRecord: async () => {
      const { error } = await supabase.from("project_media").insert({ ...record, id: attempt.id, storage_path: attempt.path });
      if (error) throw new Error(`Não foi possível registrar ${file.name}. O envio foi preservado para tentar novamente.`);
    }
  });
}
