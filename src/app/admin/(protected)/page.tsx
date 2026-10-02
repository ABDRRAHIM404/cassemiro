import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export default async function AdminOverviewPage() {
  const { supabase, profile } = await requireAdmin();
  const emailNotificationsConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.QUOTE_NOTIFICATION_EMAIL
  );
  const [newQuotes, totalQuotes, projects, testimonials, recent] = await Promise.all([
    supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "Novo"),
    supabase.from("quote_requests").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("testimonials").select("id", { count: "exact", head: true }),
    supabase.from("quote_requests").select("id, name, city, work_type, status, created_at").order("created_at", { ascending: false }).limit(5)
  ]);

  const cards = [
    { label: "Novos pedidos", value: newQuotes.count ?? 0, accent: true },
    { label: "Total de pedidos", value: totalQuotes.count ?? 0 },
    { label: "Projetos", value: projects.count ?? 0 },
    { label: "Depoimentos", value: testimonials.count ?? 0 }
  ];

  return (
    <main id="conteudo" className="admin-content">
      <div className="admin-page-heading">
        <div><p className="eyebrow eyebrow--dark">Visão geral</p><h1>Olá, {profile.display_name.split(" ")[0]}.</h1></div>
        <p>Acompanhe os novos contatos e mantenha o atendimento em movimento.</p>
      </div>
      {!emailNotificationsConfigured && (
        <div className="admin-email-warning" role="status">
          <strong>Alertas por e-mail ainda não configurados.</strong>
          <span>Os pedidos são guardados aqui no painel, mas nenhum aviso por e-mail é enviado. Verifique esta lista regularmente até o envio ser configurado.</span>
        </div>
      )}
      <section className="admin-metrics" aria-label="Indicadores">
        {cards.map((card, index) => <article key={card.label} className={card.accent ? "is-accent" : ""}><span>0{index + 1}</span><strong>{card.value}</strong><p>{card.label}</p></article>)}
      </section>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><span>ATIVIDADE RECENTE</span><h2>Novos orçamentos</h2></div><Link href="/admin/orcamentos">Ver todos →</Link></div>
        {recent.data?.length ? (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Tipo</th><th>Cidade</th><th>Status</th><th>Recebido</th><th /></tr></thead><tbody>
            {recent.data.map((quote) => <tr key={quote.id}><td><strong>{quote.name}</strong></td><td>{quote.work_type}</td><td>{quote.city}</td><td><span className={`status status--${quote.status.toLowerCase().replace(" ", "-")}`}>{quote.status}</span></td><td>{formatDate(quote.created_at)}</td><td><Link href={`/admin/orcamentos/${quote.id}`} aria-label={`Abrir orçamento de ${quote.name}`}>→</Link></td></tr>)}
          </tbody></table></div>
        ) : <div className="admin-empty"><span>00</span><h3>Nenhum pedido ainda.</h3><p>As solicitações enviadas pelo site aparecerão aqui.</p></div>}
      </section>
    </main>
  );
}
