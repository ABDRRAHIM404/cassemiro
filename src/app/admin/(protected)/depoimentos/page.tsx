import { WorkspaceSubmit } from "@/components/admin/WorkspaceSubmit";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createTestimonial, toggleTestimonial } from "./actions";

export default async function TestimonialsAdminPage({ searchParams }: { searchParams: Promise<{ created?: string; deleted?: string; updated?: string; error?: string }> }) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: testimonials } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
  return <main id="conteudo" className="admin-content">
    <div className="admin-page-heading"><div><p className="eyebrow eyebrow--dark">Confiança</p><h1>Depoimentos</h1></div><p>Cadastre somente avaliações reais e publique apenas após confirmar o texto e a autoria.</p></div>
    {(query.created === "1" || query.deleted === "1") && <div className="admin-notice">{query.deleted ? "Depoimento removido." : "Depoimento criado."}</div>}
    {query.updated === "1" && <div className="admin-notice">Publicação atualizada.</div>}
    {query.error && <div className="admin-alert" role="alert">{query.error}</div>}
    <section className="admin-panel testimonial-create"><div className="admin-panel__heading"><div><span>NOVO DEPOIMENTO</span><h2>Adicionar avaliação real</h2></div></div>
      <form action={createTestimonial} className="testimonial-form">
        <label className="admin-field"><span>Nome do cliente *</span><input name="customer_name" minLength={2} maxLength={100} required /></label>
        <label className="admin-field"><span>Fonte (obrigatória para publicar)</span><input name="source" maxLength={100} placeholder="Ex.: WhatsApp, Google" /></label>
        <label className="admin-field"><span>Nota</span><select name="rating" defaultValue=""><option value="">Sem nota</option>{[5,4,3,2,1].map((n) => <option value={n} key={n}>{n} estrelas</option>)}</select></label>
        <label className="admin-field admin-field--full"><span>Depoimento *</span><textarea name="text" minLength={10} maxLength={2000} rows={5} required /></label>
        <label className="admin-check"><input name="is_approved" type="checkbox" /><span>Publicar agora</span></label>
        <label className="admin-check admin-check--full"><input name="permission_confirmed" type="checkbox" /><span>Confirmo que o cliente autorizou o uso deste texto e do seu nome no site.</span></label>
        <WorkspaceSubmit>Adicionar depoimento</WorkspaceSubmit>
      </form>
    </section>
    <section className="admin-panel testimonial-list"><div className="admin-panel__heading"><div><span>{String(testimonials?.length ?? 0).padStart(2,"0")} CADASTRADOS</span><h2>Avaliações</h2></div></div>
      {testimonials?.length ? testimonials.map((item) => <article key={item.id}><div><strong>{item.customer_name}</strong><span>{item.rating ? "★".repeat(item.rating) : item.source || "Sem fonte informada"}</span><p>“{item.text}”</p></div>{item.is_approved ? <form action={toggleTestimonial.bind(null, item.id, false)}><button className="status status--published" type="submit" aria-label={`Retirar ${item.customer_name} do site`}>Publicado</button></form> : <Link className="status status--draft" href={`/admin/depoimentos/${item.id}`}>Pendente</Link>}<Link href={`/admin/depoimentos/${item.id}`}>{item.is_approved ? "Editar →" : "Revisar →"}</Link></article>) : <div className="admin-empty"><span>SEM DEPOIMENTOS</span><h3>Nenhuma avaliação cadastrada.</h3><p>A seção pública continuará oculta.</p></div>}
    </section>
  </main>;
}
