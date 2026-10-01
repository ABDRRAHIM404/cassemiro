"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const serviceSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  short_description: z.string().trim().min(10).max(400),
  content: z.string().trim().min(20).max(12000),
  is_visible: z.boolean(),
  show_price: z.boolean(),
  price_label: optionalText(100),
  seo_title: optionalText(70),
  seo_description: optionalText(170)
}).refine((value) => !value.show_price || Boolean(value.price_label), { path: ["price_label"] });

function revalidateService(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/servicos");
  revalidatePath("/admin/servicos");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/servicos/${slug}`);
}

export async function updateService(serviceId: string, formData: FormData) {
  const id = z.uuid().safeParse(serviceId);
  const parsed = serviceSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    short_description: formData.get("short_description"),
    content: formData.get("content"),
    is_visible: formData.get("is_visible") === "on",
    show_price: formData.get("show_price") === "on",
    price_label: String(formData.get("price_label") ?? ""),
    seo_title: String(formData.get("seo_title") ?? ""),
    seo_description: String(formData.get("seo_description") ?? "")
  });
  if (!id.success || !parsed.success) redirect(`/admin/servicos/${serviceId}?error=Revise+os+campos.+O+preço+é+obrigatório+quando+estiver+visível.`);

  const { supabase } = await requireAdmin();
  const { data: previous } = await supabase.from("services").select("slug").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("services").update(parsed.data).eq("id", id.data);
  if (error) {
    const message = error.code === "23505" ? "Este slug já pertence a outro serviço." : "Não foi possível salvar o serviço.";
    redirect(`/admin/servicos/${id.data}?error=${encodeURIComponent(message)}`);
  }
  revalidateService(previous?.slug);
  revalidateService(parsed.data.slug);
  redirect(`/admin/servicos/${id.data}?saved=1`);
}

export async function toggleServiceVisibility(serviceId: string, visible: boolean) {
  const id = z.uuid().safeParse(serviceId);
  if (!id.success) redirect("/admin/servicos?error=Serviço+inválido.");
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("services").update({ is_visible: visible }).eq("id", id.data).select("slug").single();
  if (error || !data) redirect("/admin/servicos?error=Não+foi+possível+alterar+a+visibilidade.");
  revalidateService(data.slug);
  redirect("/admin/servicos?updated=1");
}

export async function moveService(serviceId: string, direction: -1 | 1) {
  const id = z.uuid().safeParse(serviceId);
  if (!id.success || ![-1, 1].includes(direction)) redirect("/admin/servicos?error=Ordem+inválida.");
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("swap_service_order", { p_service_id: id.data, p_direction: direction });
  if (error || !data) redirect("/admin/servicos?error=Não+foi+possível+reordenar+os+serviços.");
  revalidateService();
  redirect("/admin/servicos?reordered=1");
}
