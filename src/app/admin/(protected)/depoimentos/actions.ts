"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { needsTestimonialAttestation, testimonialContentChanged } from "@/lib/testimonial-publication";

const testimonialSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  text: z.string().trim().min(10).max(2000),
  rating: z.union([z.literal(""), z.coerce.number().int().min(1).max(5)]).transform((value) => value === "" ? null : value),
  source: z.string().trim().max(100).transform((value) => value || null),
  is_approved: z.boolean()
});

function parse(formData: FormData) {
  return testimonialSchema.safeParse({
    customer_name: formData.get("customer_name"), text: formData.get("text"),
    rating: String(formData.get("rating") ?? ""), source: String(formData.get("source") ?? ""),
    is_approved: formData.get("is_approved") === "on"
  });
}

function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/depoimentos");
}

function publicationError(source: string | null, confirmed: boolean) {
  if (!source) return "Informe a fonte do depoimento antes de publicar.";
  if (!confirmed) return "Confirme que o cliente autorizou a publicação do depoimento.";
  return null;
}

export async function createTestimonial(formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) redirect("/admin/depoimentos?error=Revise+o+nome+e+o+depoimento.");
  if (parsed.data.is_approved) {
    const error = publicationError(parsed.data.source, formData.get("permission_confirmed") === "on");
    if (error) redirect(`/admin/depoimentos?error=${encodeURIComponent(error)}`);
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("testimonials").insert({
    ...parsed.data,
    permission_attested_at: parsed.data.is_approved ? new Date().toISOString() : null
  });
  if (error) redirect("/admin/depoimentos?error=Não+foi+possível+criar+o+depoimento.");
  refresh();
  redirect("/admin/depoimentos?created=1");
}

export async function updateTestimonial(idValue: string, formData: FormData) {
  const id = z.uuid().safeParse(idValue);
  const parsed = parse(formData);
  if (!id.success || !parsed.success) redirect(`/admin/depoimentos/${idValue}?error=Revise+os+campos.`);
  const { supabase } = await requireAdmin();
  const { data: previous, error: readError } = await supabase.from("testimonials")
    .select("customer_name, text, rating, source, is_approved, permission_attested_at")
    .eq("id", id.data).single();
  if (readError || !previous) redirect(`/admin/depoimentos/${id.data}?error=Depoimento+não+encontrado.`);

  const contentChanged = testimonialContentChanged(previous, parsed.data);
  const confirmed = formData.get("permission_confirmed") === "on";
  const needsAttestation = needsTestimonialAttestation(previous, parsed.data);
  if (needsAttestation || (parsed.data.is_approved && confirmed)) {
    const error = publicationError(parsed.data.source, confirmed);
    if (error) redirect(`/admin/depoimentos/${id.data}?error=${encodeURIComponent(error)}`);
  }

  const permissionAttestedAt = parsed.data.is_approved && (confirmed || needsAttestation)
    ? new Date().toISOString()
    : contentChanged ? null : previous.permission_attested_at;
  const { error } = await supabase.from("testimonials")
    .update({ ...parsed.data, permission_attested_at: permissionAttestedAt }).eq("id", id.data);
  if (error) redirect(`/admin/depoimentos/${id.data}?error=Não+foi+possível+salvar.`);
  refresh();
  redirect(`/admin/depoimentos/${id.data}?saved=1`);
}

export async function toggleTestimonial(idValue: string, approved: boolean) {
  const id = z.uuid().safeParse(idValue);
  if (!id.success) redirect("/admin/depoimentos?error=Depoimento+inválido.");
  const { supabase } = await requireAdmin();
  if (approved) {
    const { data: item, error: readError } = await supabase.from("testimonials")
      .select("source, permission_attested_at").eq("id", id.data).single();
    if (readError || !item) redirect("/admin/depoimentos?error=Depoimento+não+encontrado.");
    if (!item.source?.trim() || !item.permission_attested_at) {
      redirect("/admin/depoimentos?error=Abra+o+depoimento,+informe+a+fonte+e+confirme+a+autorização+antes+de+publicar.");
    }
  }
  const { data, error } = await supabase.from("testimonials").update({ is_approved: approved }).eq("id", id.data).select("id").single();
  if (error || !data) redirect("/admin/depoimentos?error=Não+foi+possível+alterar+a+publicação.");
  refresh();
  redirect("/admin/depoimentos?updated=1");
}

export async function deleteTestimonial(idValue: string) {
  const id = z.uuid().safeParse(idValue);
  if (!id.success) redirect("/admin/depoimentos?error=Depoimento+inválido.");
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("testimonials").delete().eq("id", id.data).select("id").single();
  if (error || !data) redirect("/admin/depoimentos?error=Não+foi+possível+excluir+o+depoimento.");
  refresh();
  redirect("/admin/depoimentos?deleted=1");
}
