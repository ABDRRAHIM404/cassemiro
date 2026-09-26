"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["Novo", "Em contato", "Orçamento", "Fechado", "Arquivado"])
});

export async function updateQuoteStatus(formData: FormData) {
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return;

  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("quote_requests").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) throw new Error("Não foi possível atualizar o status.");

  revalidatePath("/admin");
  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${parsed.data.id}`);
}
