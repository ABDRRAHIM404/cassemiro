import { WorkspaceSubmit } from "@/components/admin/WorkspaceSubmit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { defaultHomepageContent, parseHomepageContent } from "@/lib/site-settings";
import { updateHomepageContent } from "./actions";

const fields: { key: keyof typeof defaultHomepageContent; label: string; area?: boolean }[] = [
  { key: "heroEyebrow", label: "Linha superior do destaque" }, { key: "heroLineOne", label: "Título — primeira linha" }, { key: "heroLineTwo", label: "Título — segunda linha" }, { key: "heroIntro", label: "Introdução do destaque", area: true },
  { key: "aboutEyebrow", label: "Linha superior sobre Sérgio" }, { key: "aboutTitle", label: "Frase principal sobre Sérgio", area: true }, { key: "aboutParagraphOne", label: "Primeiro parágrafo", area: true }, { key: "aboutParagraphTwo", label: "Segundo parágrafo", area: true },
  { key: "ctaEyebrow", label: "Linha superior da chamada final" }, { key: "ctaTitle", label: "Título da chamada final" }, { key: "ctaText", label: "Texto da chamada final", area: true }
];
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams; const { supabase } = await requireAdmin();
  const { data } = await supabase.from("site_settings").select("key, value").eq("key", "homepage_content");
  const content = parseHomepageContent(data ?? []);
  return <main id="conteudo" className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow eyebrow--dark">Página inicial</p><h1>Conteúdo</h1></div><p>Atualize os textos principais sem alterar a estrutura ou as animações do site.</p></div>{query.saved && <div className="admin-notice">Conteúdo publicado.</div>}{query.error && <div className="admin-alert">{query.error}</div>}<form action={updateHomepageContent} className="admin-panel content-form"><div className="admin-panel__heading"><div><span>TEXTOS PÚBLICOS</span><h2>Página inicial</h2></div></div><div className="content-form__fields">{fields.map((field) => <label className="admin-field" key={field.key}><span>{field.label}</span>{field.area ? <textarea name={field.key} defaultValue={content[field.key]} rows={4} required /> : <input name={field.key} defaultValue={content[field.key]} required />}</label>)}</div><WorkspaceSubmit>Salvar e publicar</WorkspaceSubmit></form></main>;
}
