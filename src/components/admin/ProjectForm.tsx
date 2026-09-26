import type { Database } from "@/types/supabase";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Service = Pick<Database["public"]["Tables"]["services"]["Row"], "id" | "title">;

export function ProjectForm({
  action,
  project,
  services,
  selectedServices = []
}: {
  action: (formData: FormData) => void | Promise<void>;
  project?: Project;
  services: Service[];
  selectedServices?: string[];
}) {
  return (
    <form action={action} className="project-form">
      <section className="admin-panel project-form__main">
        <div className="admin-panel__heading"><div><span>DADOS PRINCIPAIS</span><h2>Apresentação do projeto</h2></div></div>
        <div className="project-form__fields">
          <label className="admin-field admin-field--full"><span>Título *</span><input name="title" defaultValue={project?.title} maxLength={120} required /></label>
          <label className="admin-field"><span>Slug</span><input name="slug" defaultValue={project?.slug} maxLength={140} placeholder="gerado a partir do título" /></label>
          <label className="admin-field"><span>Cidade</span><input name="city" defaultValue={project?.city ?? ""} maxLength={100} /></label>
          <label className="admin-field"><span>Categoria</span><input name="category" defaultValue={project?.category ?? ""} maxLength={100} placeholder="Ex.: Construção residencial" /></label>
          <label className="admin-field"><span>Duração</span><input name="duration" defaultValue={project?.duration ?? ""} maxLength={100} placeholder="Ex.: 10 meses" /></label>
          <label className="admin-field admin-field--full"><span>Resumo</span><textarea name="summary" defaultValue={project?.summary} maxLength={500} rows={4} /></label>
          <label className="admin-field admin-field--full"><span>Descrição completa</span><textarea name="content" defaultValue={project?.content} maxLength={12000} rows={12} /></label>
          <label className="admin-field admin-field--full"><span>URL de vídeo externo</span><input name="video_url" type="url" defaultValue={project?.video_url ?? ""} placeholder="https://…" /></label>
        </div>
      </section>

      <aside className="project-form__side">
        <section className="admin-panel project-form__box">
          <span>PUBLICAÇÃO</span>
          <label className="admin-check"><input name="is_published" type="checkbox" defaultChecked={project?.is_published ?? false} /><span>Projeto publicado</span></label>
          <p>Somente publique quando os textos e as imagens reais estiverem prontos.</p>
        </section>
        <section className="admin-panel project-form__box">
          <span>SERVIÇOS REALIZADOS</span>
          <div className="project-form__checks">
            {services.map((service) => <label className="admin-check" key={service.id}><input name="service_ids" type="checkbox" value={service.id} defaultChecked={selectedServices.includes(service.id)} /><span>{service.title}</span></label>)}
          </div>
        </section>
        <section className="admin-panel project-form__box">
          <span>SEO</span>
          <label className="admin-field"><span>Título para busca</span><input name="seo_title" defaultValue={project?.seo_title ?? ""} maxLength={70} /></label>
          <label className="admin-field"><span>Descrição para busca</span><textarea name="seo_description" defaultValue={project?.seo_description ?? ""} maxLength={170} rows={4} /></label>
        </section>
        <button className="button button--bronze project-form__save" type="submit">{project ? "Salvar projeto" : "Criar projeto"}</button>
      </aside>
    </form>
  );
}
