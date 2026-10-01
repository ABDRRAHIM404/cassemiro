import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { whatsappUrlForPhone } from "@/lib/phone";
import { updateQuoteStatus } from "../actions";

const statuses = ["Novo", "Em contato", "Orçamento", "Fechado", "Arquivado"] as const;

function formatDate(value: string, withTime = true) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", ...(withTime ? { timeStyle: "short" as const } : {}), timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: quote } = await supabase.from("quote_requests").select("*").eq("id", id).maybeSingle();
  if (!quote) notFound();

  const message = `Olá, ${quote.name}. Recebemos sua solicitação de orçamento para ${quote.work_type} pelo site da CASSEMIRO.`;
  const whatsappUrl = whatsappUrlForPhone(quote.phone, message);

  return (
    <main id="conteudo" className="admin-content">
      <Link href="/admin/orcamentos" className="admin-back">← Voltar aos orçamentos</Link>
      <div className="admin-page-heading admin-page-heading--detail">
        <div><p className="eyebrow eyebrow--dark">Solicitação recebida em {formatDate(quote.created_at)}</p><h1>{quote.name}</h1></div>
        <span className={`status status--large status--${quote.status.toLowerCase().replace(" ", "-")}`}>{quote.status}</span>
      </div>
      <div className="quote-detail-grid">
        <section className="admin-panel quote-detail-main">
          <div className="admin-panel__heading"><div><span>PROJETO</span><h2>{quote.work_type}</h2></div></div>
          <div className="quote-description">{quote.description}</div>
          <dl className="quote-meta">
            <div><dt>Cidade</dt><dd>{quote.city}</dd></div>
            <div><dt>Início desejado</dt><dd>{quote.desired_start_date ? formatDate(`${quote.desired_start_date}T12:00:00`, false) : "Não informado"}</dd></div>
            <div><dt>Origem</dt><dd>{quote.source === "website" ? "Site" : quote.source}</dd></div>
            <div><dt>Atualizado</dt><dd>{formatDate(quote.updated_at)}</dd></div>
          </dl>
          {(quote.utm_source || quote.utm_medium || quote.utm_campaign) && <div className="quote-tracking"><span>Campanha</span><p>{[quote.utm_source, quote.utm_medium, quote.utm_campaign].filter(Boolean).join(" · ")}</p></div>}
        </section>
        <aside className="quote-detail-side">
          <section className="admin-panel quote-contact">
            <span>CONTATO</span>
            <a href={`tel:${quote.phone}`} className="quote-contact__phone">{quote.phone}</a>
            {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="button button--bronze">Abrir WhatsApp</a> : <p>Confirme o DDD e o número antes de abrir o WhatsApp.</p>}
          </section>
          <section className="admin-panel quote-status-form">
            <span>ANDAMENTO</span>
            <form action={updateQuoteStatus}>
              <input type="hidden" name="id" value={quote.id} />
              <label htmlFor="quote-status">Atualizar status</label>
              <select id="quote-status" name="status" defaultValue={quote.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
              <button type="submit">Salvar alteração</button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
