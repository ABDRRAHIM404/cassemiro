"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";

const schema = z.object({ legalName: z.string().min(2).max(150), phoneDisplay: z.string().min(8).max(30), phoneE164: z.string().regex(/^\d{10,15}$/), email: z.email(), cnpj: z.string().max(30), instagram: z.union([z.literal(""), z.url()]), facebook: z.union([z.literal(""), z.url()]), serviceAreas: z.array(z.string().min(2).max(80)).min(1).max(30), serviceRadiusKm: z.coerce.number().int().min(1).max(500), quoteMessage: z.string().min(10).max(500), recruitmentMessage: z.string().min(10).max(500) });
export async function updateBusinessSettings(formData: FormData) {
  const parsed = schema.safeParse({ legalName: formData.get("legalName"), phoneDisplay: formData.get("phoneDisplay"), phoneE164: String(formData.get("phoneE164") ?? "").replace(/\D/g, ""), email: formData.get("email"), cnpj: String(formData.get("cnpj") ?? "").trim(), instagram: String(formData.get("instagram") ?? "").trim(), facebook: String(formData.get("facebook") ?? "").trim(), serviceAreas: String(formData.get("serviceAreas") ?? "").split(/[,\n]/).map((v) => v.trim()).filter(Boolean), serviceRadiusKm: formData.get("serviceRadiusKm"), quoteMessage: formData.get("quoteMessage"), recruitmentMessage: formData.get("recruitmentMessage") });
  if (!parsed.success) redirect("/admin/configuracoes?error=Revise+os+dados+de+contato+e+as+URLs.");
  const d = parsed.data; const rows = [
    { key: "legal_name", value: d.legalName }, { key: "phone", value: { display: d.phoneDisplay, e164: d.phoneE164 } }, { key: "email", value: d.email }, { key: "cnpj", value: d.cnpj }, { key: "instagram_url", value: d.instagram }, { key: "facebook_url", value: d.facebook }, { key: "service_areas", value: d.serviceAreas }, { key: "service_radius_km", value: d.serviceRadiusKm }, { key: "quote_message", value: d.quoteMessage }, { key: "recruitment_message", value: d.recruitmentMessage }
  ].map((row) => ({ ...row, is_public: true }));
  const { supabase } = await requireAdmin(); const { error } = await supabase.from("site_settings").upsert(rows);
  if (error) redirect("/admin/configuracoes?error=Não+foi+possível+salvar+as+configurações.");
  revalidatePath("/", "layout"); revalidatePath("/contato"); redirect("/admin/configuracoes?saved=1");
}
