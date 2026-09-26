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
  if (!id.success) return;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("services").update({ is_visible: visible }).eq("id", id.data).select("slug").single();
  revalidateService(data?.slug);
}

export async function moveService(serviceId: string, direction: -1 | 1) {
  const id = z.uuid().safeParse(serviceId);
  if (!id.success || ![-1, 1].includes(direction)) return;
  const { supabase } = await requireAdmin();
  const { data: services } = await supabase.from("services").select("id, sort_order").order("sort_order").order("title");
  const index = services?.findIndex((service) => service.id === id.data) ?? -1;
  const other = services?.[index + direction];
  const current = services?.[index];
  if (!current || !other) return;
  await Promise.all([
    supabase.from("services").update({ sort_order: other.sort_order }).eq("id", current.id),
    supabase.from("services").update({ sort_order: current.sort_order }).eq("id", other.id)
  ]);
  revalidateService();
}
