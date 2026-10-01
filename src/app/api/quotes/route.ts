import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { quoteRequestSchema } from "@/features/quotes/validation";
import { checkQuoteRateLimit, quoteClientIdentity } from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

export async function POST(request: NextRequest) {
  const clientKey = quoteClientIdentity(request.headers.get("x-forwarded-for"));
  const supabase = createSupabaseAdmin();
  if (!supabase || !clientKey) {
    return NextResponse.json({ error: "O formulário ainda não está disponível. Continue pelo WhatsApp." }, { status: 503 });
  }

  const rateLimit = await checkQuoteRateLimit(clientKey, supabase);
  if (rateLimit.error) {
    return NextResponse.json({ error: "Não foi possível registrar a solicitação agora. Continue pelo WhatsApp." }, { status: 503 });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Não foi possível ler os dados enviados." }, { status: 400 });
  }

  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revise os campos e tente novamente." }, { status: 400 });
  }

  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const quote = parsed.data;
  const { data: savedQuote, error: databaseError } = await supabase
    .from("quote_requests")
    .insert({
      name: quote.name,
      phone: quote.phone,
      city: quote.city,
      work_type: quote.workType,
      description: quote.description,
      desired_start_date: quote.desiredStart || null,
      source: "website",
      utm_source: quote.utmSource || null,
      utm_medium: quote.utmMedium || null,
      utm_campaign: quote.utmCampaign || null
    })
    .select("id, created_at")
    .single();

  if (databaseError || !savedQuote) {
    console.error("Quote storage failed", databaseError?.message);
    Sentry.captureException(databaseError ?? new Error("Quote storage returned no record"), { tags: { operation: "quote_insert" } });
    return NextResponse.json({ error: "Não foi possível registrar a solicitação. Tente novamente ou fale pelo WhatsApp." }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.QUOTE_NOTIFICATION_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (resendKey && notificationEmail && fromEmail) {
    const resend = new Resend(resendKey);
    const desiredStart = quote.desiredStart || "Não informado";
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: notificationEmail,
      subject: `Novo orçamento — ${quote.name} · ${quote.workType}`,
      html: `<h1>Nova solicitação de orçamento</h1><p><strong>Nome:</strong> ${escapeHtml(quote.name)}</p><p><strong>Telefone:</strong> ${escapeHtml(quote.phone)}</p><p><strong>Cidade:</strong> ${escapeHtml(quote.city)}</p><p><strong>Tipo de obra:</strong> ${escapeHtml(quote.workType)}</p><p><strong>Data desejada:</strong> ${escapeHtml(desiredStart)}</p><p><strong>Descrição:</strong><br>${escapeHtml(quote.description).replace(/\n/gu, "<br>")}</p><p><strong>Recebido em:</strong> ${escapeHtml(savedQuote.created_at)}</p>`
    });

    if (emailError) {
      console.error("Quote notification email failed", emailError.message);
      Sentry.captureException(emailError, { tags: { operation: "quote_notification" } });
    }
  }

  return NextResponse.json({ ok: true, id: savedQuote.id }, { status: 201 });
}
