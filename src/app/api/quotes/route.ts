import { NextRequest, NextResponse } from "next/server";
import { quoteRequestSchema } from "@/features/quotes/validation";
import { checkQuoteRateLimit, quoteClientIdentity } from "@/lib/rate-limit";
import { readLimitedJson } from "@/lib/http/read-limited-json";
import { optionalNotificationError } from "@/lib/quotes/optional-notification";
import { sendQuoteNotification } from "@/lib/quotes/send-notification";
import { quoteFailureDiagnostic } from "@/lib/quotes/failure-diagnostic";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
const MAX_QUOTE_BODY_BYTES = 16 * 1024;

function privateJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" }
  });
}

export async function POST(request: NextRequest) {
  const clientKey = quoteClientIdentity(request.headers);
  if (!clientKey) {
    return privateJson({ error: "O formulário ainda não está disponível. Continue pelo WhatsApp." }, 503);
  }

  const body = await readLimitedJson(request, MAX_QUOTE_BODY_BYTES);
  if (!body.ok && body.reason === "too-large") {
    return privateJson({ error: "A solicitação é muito grande. Reduza o texto e tente novamente." }, 413);
  }
  if (!body.ok) {
    return privateJson({ error: "Não foi possível ler os dados enviados." }, 400);
  }

  const parsed = quoteRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return privateJson({ error: "Revise os campos e tente novamente." }, 400);
  }

  if (parsed.data.company) {
    return privateJson({ ok: true }, 200);
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return privateJson({ error: "O formulário ainda não está disponível. Continue pelo WhatsApp." }, 503);
  }

  const rateLimit = await checkQuoteRateLimit(clientKey, supabase);
  if (rateLimit.error) {
    return privateJson({ error: "Não foi possível registrar a solicitação agora. Continue pelo WhatsApp." }, 503);
  }

  if (!rateLimit.allowed) {
    return privateJson({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, 429);
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
    const diagnostic = quoteFailureDiagnostic("quote_insert", databaseError);
    console.error(diagnostic.error.message, diagnostic.tags);
    Sentry.captureException(diagnostic.error, { tags: diagnostic.tags });
    return privateJson({ error: "Não foi possível registrar a solicitação. Tente novamente ou fale pelo WhatsApp." }, 500);
  }

  // Never notify before the database confirms a saved quote. Email failures
  // must not erase the lead or encourage customers to submit it twice.
  const emailError = await optionalNotificationError(() => sendQuoteNotification(quote, savedQuote));
  if (emailError) {
    const diagnostic = quoteFailureDiagnostic("quote_notification", emailError);
    console.error(diagnostic.error.message, diagnostic.tags);
    Sentry.captureException(diagnostic.error, { tags: diagnostic.tags });
  }
  return privateJson({ ok: true, id: savedQuote.id }, 201);
}
