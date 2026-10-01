import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_PROJECT_MEDIA_BUCKET } from "@/lib/project-media";
import { z } from "zod";

export const runtime = "nodejs";

function notFound() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFound();

  const admin = createSupabaseAdmin();
  if (!admin) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });

  const { data: media } = await admin.from("project_media")
    .select("project_id, storage_path").eq("id", id).maybeSingle();
  if (!media?.storage_path) return notFound();

  const { data: project } = await admin.from("projects")
    .select("is_published").eq("id", media.project_id).maybeSingle();
  if (!project) return notFound();

  if (!project.is_published) {
    const session = await createClient();
    const { data: claims } = await session.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) return notFound();
    const { data: profile } = await session.from("profiles")
      .select("id").eq("id", userId).maybeSingle();
    if (!profile) return notFound();
  }

  const { data, error } = await admin.storage.from(PRIVATE_PROJECT_MEDIA_BUCKET)
    .createSignedUrl(media.storage_path, 60);
  if (error || !data?.signedUrl) return notFound();

  return new Response(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer"
    }
  });
}
