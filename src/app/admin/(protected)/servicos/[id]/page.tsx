import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateService } from "../actions";

export default async function EditServicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const { data: service } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (!service) notFound();

  return (
    <main id="conteudo" className="admin-content">
      <Link href="/admin/servicos" className="admin-back">← Voltar aos serviços</Link>
      <div className="admin-page-heading admin-page-heading--detail"><div><p className="eyebrow eyebrow--dark">Editar serviço</p><h1>{service.title}</h1></div><span className={`status status--large ${service.is_visible ? "status--published" : "status--draft"}`}>{service.is_visible ? "Visível" : "Oculto"}</span></div>
      {query.saved === "1" && <div className="admin-notice">Alterações salvas e páginas públicas atualizadas.</div>}
      {query.error && <div className="admin-alert">{query.error}</div>}
      <form action={updateService.bind(null, service.id)} className="service-form">
        <section className="admin-panel">
          <div className="admin-panel__heading"><div><span>CONTEÚDO</span><h2>Apresentação do serviço</h2></div></div>
          <div className="project-form__fields">
            <label className="admin-field"><span>Título *</span><input name="title" defaultValue={service.title} maxLength={120} required /></label>
            <label className="admin-field"><span>Slug *</span><input name="slug" defaultValue={service.slug} maxLength={140} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label className="admin-field admin-field--full"><span>Descrição curta *</span><textarea name="short_description" defaultValue={service.short_description} minLength={10} maxLength={400} rows={4} required /></label>
            <label className="admin-field admin-field--full"><span>Descrição completa *</span><textarea name="content" defaultValue={service.content} minLength={20} maxLength={12000} rows={12} required /></label>
          </div>
        </section>
        <aside className="project-form__side">
          <section className="admin-panel project-form__box"><span>VISIBILIDADE</span><label className="admin-check"><input name="is_visible" type="checkbox" defaultChecked={service.is_visible} /><span>Mostrar serviço no site</span></label></section>
          <section className="admin-panel project-form__box"><span>PREÇO PÚBLICO</span><label className="admin-check"><input name="show_price" type="checkbox" defaultChecked={service.show_price} /><span>Mostrar preço</span></label><label className="admin-field"><span>Texto do preço</span><input name="price_label" defaultValue={service.price_label ?? ""} maxLength={100} placeholder="Ex.: A partir de R$ …" /></label><p>O preço permanece oculto até esta opção ser marcada.</p></section>
          <section className="admin-panel project-form__box"><span>SEO</span><label className="admin-field"><span>Título para busca</span><input name="seo_title" defaultValue={service.seo_title ?? ""} maxLength={70} /></label><label className="admin-field"><span>Descrição para busca</span><textarea name="seo_description" defaultValue={service.seo_description ?? ""} maxLength={170} rows={4} /></label></section>
          <button className="button button--bronze project-form__save" type="submit">Salvar serviço</button>
        </aside>
      </form>
    </main>
  );
}
