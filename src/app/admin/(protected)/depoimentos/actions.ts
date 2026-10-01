"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";

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

export async function createTestimonial(formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) redirect("/admin/depoimentos?error=Revise+o+nome+e+o+depoimento.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("testimonials").insert(parsed.data);
  if (error) redirect("/admin/depoimentos?error=Não+foi+possível+criar+o+depoimento.");
  refresh();
  redirect("/admin/depoimentos?created=1");
}

export async function updateTestimonial(idValue: string, formData: FormData) {
  const id = z.uuid().safeParse(idValue);
  const parsed = parse(formData);
  if (!id.success || !parsed.success) redirect(`/admin/depoimentos/${idValue}?error=Revise+os+campos.`);
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("testimonials").update(parsed.data).eq("id", id.data);
  if (error) redirect(`/admin/depoimentos/${id.data}?error=Não+foi+possível+salvar.`);
  refresh();
  redirect(`/admin/depoimentos/${id.data}?saved=1`);
}

export async function toggleTestimonial(idValue: string, approved: boolean) {
  const id = z.uuid().safeParse(idValue);
  if (!id.success) redirect("/admin/depoimentos?error=Depoimento+inválido.");
  const { supabase } = await requireAdmin();
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
