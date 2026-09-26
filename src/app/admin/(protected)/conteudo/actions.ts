"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { defaultHomepageContent } from "@/lib/site-settings";

const keys = Object.keys(defaultHomepageContent) as (keyof typeof defaultHomepageContent)[];
export async function updateHomepageContent(formData: FormData) {
  const data = Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "").trim()]));
  const parsed = z.record(z.string(), z.string().min(2).max(1000)).safeParse(data);
  if (!parsed.success) redirect("/admin/conteudo?error=Revise+os+textos+antes+de+salvar.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("site_settings").upsert({ key: "homepage_content", value: parsed.data, is_public: true });
  if (error) redirect("/admin/conteudo?error=Não+foi+possível+salvar+o+conteúdo.");
  revalidatePath("/", "layout"); redirect("/admin/conteudo?saved=1");
}
