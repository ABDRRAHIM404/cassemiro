import { z } from "zod";

const optionalTrackingField = z.string().trim().max(120).optional().nullable();

export const quoteRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(30).regex(/^[\d\s()+-]+$/u),
  city: z.string().trim().min(2).max(100),
  workType: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(3000),
  desiredStart: z.union([z.iso.date(), z.literal("")]).optional(),
  utmSource: optionalTrackingField,
  utmMedium: optionalTrackingField,
  utmCampaign: optionalTrackingField,
  company: z.string().max(0).optional()
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export function buildQuoteWhatsappMessage(input: Pick<QuoteRequestInput, "name" | "city" | "workType">) {
  return `Olá, sou ${input.name}, de ${input.city}. Acabei de solicitar um orçamento pelo site para ${input.workType} e gostaria de continuar o atendimento por aqui.`;
}
