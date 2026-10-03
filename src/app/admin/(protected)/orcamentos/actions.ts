"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["Novo", "Em contato", "Orçamento", "Fechado", "Arquivado"])
});
const quoteIdSchema = z.object({ id: z.uuid() });

export async function updateQuoteStatus(formData: FormData) {
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) redirect("/admin/orcamentos?invalid=1");

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("quote_requests")
    .update({ status: parsed.data.status }).eq("id", parsed.data.id).is("anonymized_at", null).select("id").single();
  if (error || !data) redirect(`/admin/orcamentos/${parsed.data.id}?error=1`);

  revalidatePath("/admin");
  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${parsed.data.id}`);
  redirect(`/admin/orcamentos/${parsed.data.id}?saved=1`);
}

export async function recordQuoteContact(formData: FormData) {
  const parsed = quoteIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/admin/orcamentos?invalid=1");

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("quote_requests")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", parsed.data.id).is("anonymized_at", null).select("id").single();
  if (error || !data) redirect(`/admin/orcamentos/${parsed.data.id}?error=1`);

  revalidatePath("/admin");
  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${parsed.data.id}`);
  redirect(`/admin/orcamentos/${parsed.data.id}?contacted=1`);
}
