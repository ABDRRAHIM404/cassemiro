import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/auth/require-admin";
import { toggleProjectPublished } from "./actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<{ deleted?: string; updated?: string; error?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: projects } = await supabase.from("projects")
    .select("id, title, slug, city, category, is_published, updated_at, hero_image")
    .order("updated_at", { ascending: false });

  return (
    <main id="conteudo" className="admin-content">
      <div className="admin-page-heading">
        <div><p className="eyebrow eyebrow--dark">Portfólio</p><h1>Projetos</h1></div>
        <Link className="button button--bronze" href="/admin/projetos/novo">Novo projeto</Link>
      </div>
      {params.deleted === "1" && <div className="admin-notice">Projeto e arquivos removidos.</div>}
      {params.updated === "1" && <div className="admin-notice">Publicação atualizada.</div>}
      {params.error && <div className="admin-alert" role="alert">{params.error}</div>}
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><span>{String(projects?.length ?? 0).padStart(2, "0")} PROJETOS</span><h2>Obras cadastradas</h2></div></div>
        {projects?.length ? (
          <div className="admin-table-wrap" role="region" aria-label="Tabela de registros" tabIndex={0}><table className="admin-table admin-projects-table"><thead><tr><th>Projeto</th><th>Local</th><th>Categoria</th><th>Visibilidade</th><th>Atualizado</th><th /></tr></thead><tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td><div className="admin-project-cell"><span aria-hidden="true">{project.hero_image && <Image src={project.hero_image} alt="" fill sizes="58px" unoptimized={project.hero_image.startsWith("/api/project-media/")} />}</span><strong><Link href={`/admin/projetos/${project.id}`}>{project.title}</Link></strong></div></td>
                <td>{project.city || "—"}</td><td>{project.category || "—"}</td>
                <td><form action={toggleProjectPublished.bind(null, project.id, !project.is_published)}><button className={`status ${project.is_published ? "status--published" : "status--draft"}`} type="submit">{project.is_published ? "Publicado" : "Oculto"}</button></form></td>
                <td>{formatDate(project.updated_at)}</td><td><Link href={`/admin/projetos/${project.id}`}>Editar →</Link></td>
              </tr>
            ))}
          </tbody></table></div>
        ) : <div className="admin-empty"><span>PORTFÓLIO VAZIO</span><h3>Nenhum projeto cadastrado.</h3><p>Crie a estrutura agora e adicione as informações reais quando estiverem disponíveis.</p><Link className="button button--bronze" href="/admin/projetos/novo">Criar primeiro projeto</Link></div>}
      </section>
    </main>
  );
}
