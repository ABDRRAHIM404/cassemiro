import Link from "next/link";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: services } = await supabase.from("services").select("id, title").order("sort_order");

  return (
    <main id="conteudo" className="admin-content">
      <Link href="/admin/projetos" className="admin-back">← Voltar aos projetos</Link>
      <div className="admin-page-heading"><div><p className="eyebrow eyebrow--dark">Novo cadastro</p><h1>Criar projeto</h1></div><p>Comece pelos fatos confirmados. O projeto permanece oculto até você decidir publicar.</p></div>
      {params.error && <div className="admin-alert">{params.error}</div>}
      <ProjectForm services={services ?? []} />
    </main>
  );
}
