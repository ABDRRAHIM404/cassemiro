import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteTestimonialButton } from "@/components/admin/DeleteTestimonialButton";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateTestimonial } from "../actions";

export default async function EditTestimonialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const { data: item } = await supabase.from("testimonials").select("*").eq("id", id).maybeSingle();
  if (!item) notFound();
  return <main id="conteudo" className="admin-content"><Link href="/admin/depoimentos" className="admin-back">← Voltar aos depoimentos</Link><div className="admin-page-heading admin-page-heading--detail"><div><p className="eyebrow eyebrow--dark">Editar depoimento</p><h1>{item.customer_name}</h1></div><span className={`status status--large ${item.is_approved ? "status--published" : "status--draft"}`}>{item.is_approved ? "Publicado" : "Pendente"}</span></div>
    {query.saved === "1" && <div className="admin-notice">Alterações salvas.</div>}{query.error && <div className="admin-alert">{query.error}</div>}
    <section className="admin-panel"><form action={updateTestimonial.bind(null, item.id)} className="testimonial-form testimonial-form--edit"><label className="admin-field"><span>Nome *</span><input name="customer_name" defaultValue={item.customer_name} required /></label><label className="admin-field"><span>Fonte</span><input name="source" defaultValue={item.source ?? ""} /></label><label className="admin-field"><span>Nota</span><select name="rating" defaultValue={item.rating ?? ""}><option value="">Sem nota</option>{[5,4,3,2,1].map((n) => <option value={n} key={n}>{n} estrelas</option>)}</select></label><label className="admin-field admin-field--full"><span>Depoimento *</span><textarea name="text" defaultValue={item.text} rows={8} required /></label><label className="admin-check"><input name="is_approved" type="checkbox" defaultChecked={item.is_approved} /><span>Publicado no site</span></label><button type="submit">Salvar depoimento</button></form></section>
    <section className="admin-delete-zone"><div><strong>Excluir depoimento</strong><p>Remove permanentemente esta avaliação.</p></div><DeleteTestimonialButton id={item.id} name={item.customer_name} /></section>
  </main>;
}
