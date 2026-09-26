import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { moveService, toggleServiceVisibility } from "./actions";

export default async function AdminServicesPage() {
  const { supabase } = await requireAdmin();
  const { data: services } = await supabase.from("services").select("*").order("sort_order").order("title");

  return (
    <main id="conteudo" className="admin-content">
      <div className="admin-page-heading"><div><p className="eyebrow eyebrow--dark">Catálogo</p><h1>Serviços</h1></div><p>Edite os serviços, defina a ordem no site e controle individualmente a visibilidade de preços.</p></div>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><span>{String(services?.length ?? 0).padStart(2, "0")} SERVIÇOS</span><h2>Áreas de atuação</h2></div><Link href="/servicos" target="_blank">Ver no site ↗</Link></div>
        <div className="admin-services-list">
          {services?.map((service, index) => (
            <article key={service.id}>
              <div className="admin-service-order"><span>{String(index + 1).padStart(2, "0")}</span><form action={moveService.bind(null, service.id, -1)}><button type="submit" disabled={index === 0} aria-label={`Mover ${service.title} para cima`}>↑</button></form><form action={moveService.bind(null, service.id, 1)}><button type="submit" disabled={index === services.length - 1} aria-label={`Mover ${service.title} para baixo`}>↓</button></form></div>
              <div className="admin-service-copy"><strong>{service.title}</strong><p>{service.short_description}</p>{service.show_price && service.price_label && <small>{service.price_label}</small>}</div>
              <form action={toggleServiceVisibility.bind(null, service.id, !service.is_visible)}><button className={`status ${service.is_visible ? "status--published" : "status--draft"}`} type="submit">{service.is_visible ? "Visível" : "Oculto"}</button></form>
              <Link href={`/admin/servicos/${service.id}`}>Editar →</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
