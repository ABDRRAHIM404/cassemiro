import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { QUOTES_PAGE_SIZE, quotePageHref, quotePageNumber } from "@/lib/admin/quote-pagination";

const statuses = ["Novo", "Em contato", "Orçamento", "Fechado", "Arquivado"] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

type QuotesPageProps = { searchParams: Promise<{ status?: string; busca?: string; pagina?: string; invalid?: string }> };

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const status = statuses.includes(params.status as typeof statuses[number]) ? params.status as typeof statuses[number] : "";
  const search = params.busca?.trim().replace(/[,%()]/gu, "").slice(0, 80) ?? "";
  const page = quotePageNumber(params.pagina);
  const first = (page - 1) * QUOTES_PAGE_SIZE;

  let query = supabase.from("quote_requests")
    .select("id, name, phone, city, work_type, status, created_at", { count: "exact" })
    .is("anonymized_at", null)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(first, first + QUOTES_PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (search) query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data: quotes, count, error } = await query;
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / QUOTES_PAGE_SIZE));

  return (
    <main id="conteudo" className="admin-content">
      <div className="admin-page-heading"><div><p className="eyebrow eyebrow--dark">Atendimento</p><h1>Orçamentos</h1></div><p>Organize os contatos recebidos e acompanhe cada conversa.</p></div>
      {params.invalid === "1" && <div className="admin-alert" role="alert">Não foi possível alterar o status. Confira a solicitação e tente novamente.</div>}
      <form className="admin-filters" method="get">
        <label><span>Buscar</span><input name="busca" defaultValue={search} placeholder="Nome, cidade ou telefone" /></label>
        <label><span>Status</span><select name="status" defaultValue={status}><option value="">Todos</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="submit">Filtrar</button>
        {(status || search) && <Link href="/admin/orcamentos">Limpar</Link>}
      </form>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><span>RESULTADOS</span><h2>{error || count === null ? "Solicitações indisponíveis" : `${total} ${total === 1 ? "solicitação" : "solicitações"}`}</h2></div></div>
        {error || count === null ? <div className="admin-alert" role="alert">Não foi possível carregar os orçamentos. Atualize a página ou tente novamente em alguns minutos.</div> : quotes?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Contato</th><th>Obra</th><th>Cidade</th><th>Status</th><th>Recebido</th><th /></tr></thead><tbody>
          {quotes.map((quote) => <tr key={quote.id}><td><strong>{quote.name}</strong></td><td><a href={`tel:${quote.phone}`}>{quote.phone}</a></td><td>{quote.work_type}</td><td>{quote.city}</td><td><span className={`status status--${quote.status.toLowerCase().replace(" ", "-")}`}>{quote.status}</span></td><td>{formatDate(quote.created_at)}</td><td><Link href={`/admin/orcamentos/${quote.id}`}>Abrir →</Link></td></tr>)}
        </tbody></table></div> : <div className="admin-empty"><span>00</span><h3>{total ? "Esta página não contém solicitações." : "Nenhuma solicitação encontrada."}</h3><p>{total ? <Link href={quotePageHref(1, status, search)}>Voltar à primeira página</Link> : "Ajuste os filtros ou aguarde um novo contato pelo site."}</p></div>}
        {!error && count !== null && total > 0 && <nav className="admin-pager" aria-label="Páginas de orçamentos">
          <span>Página {page} de {pages}</span>
          <div>
            {page > 1 && <Link href={quotePageHref(page - 1, status, search)}>← Anterior</Link>}
            {page < pages && <Link href={quotePageHref(page + 1, status, search)}>Próxima →</Link>}
          </div>
        </nav>}
      </section>
    </main>
  );
}
