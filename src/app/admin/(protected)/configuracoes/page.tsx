import { WorkspaceSubmit } from "@/components/admin/WorkspaceSubmit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBusinessSettings } from "@/lib/site-settings";
import { updateBusinessSettings } from "./actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams; const { supabase } = await requireAdmin();
  const { data } = await supabase.from("site_settings").select("key, value"); const settings = parseBusinessSettings(data ?? []);
  return <main id="conteudo" className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow eyebrow--dark">Dados da empresa</p><h1>Configurações</h1></div><p>Estas informações alimentam os contatos e dados institucionais do site.</p></div>{query.saved && <div className="admin-notice">Configurações atualizadas.</div>}{query.error && <div className="admin-alert">{query.error}</div>}<form action={updateBusinessSettings} className="admin-panel settings-form"><div className="admin-panel__heading"><div><span>INFORMAÇÕES PÚBLICAS</span><h2>Empresa e atendimento</h2></div></div><div className="project-form__fields">
    <label className="admin-field"><span>Razão social</span><input name="legalName" defaultValue={settings.legalName} required /></label><label className="admin-field"><span>CNPJ</span><input name="cnpj" defaultValue={settings.cnpj} placeholder="Deixe vazio enquanto não confirmado" /></label>
    <label className="admin-field"><span>Telefone exibido</span><input name="phoneDisplay" defaultValue={settings.phoneDisplay} required /></label><label className="admin-field"><span>Telefone internacional (somente números)</span><input name="phoneE164" defaultValue={settings.phoneE164} required /></label>
    <label className="admin-field"><span>E-mail</span><input name="email" type="email" defaultValue={settings.email} required /></label><label className="admin-field"><span>Raio de atendimento (km)</span><input name="serviceRadiusKm" type="number" defaultValue={settings.serviceRadiusKm} min={1} max={500} required /></label>
    <label className="admin-field"><span>Instagram</span><input name="instagram" type="url" defaultValue={settings.instagram} placeholder="https://…" /></label><label className="admin-field"><span>Facebook</span><input name="facebook" type="url" defaultValue={settings.facebook} placeholder="https://…" /></label>
    <label className="admin-field admin-field--full"><span>Cidades atendidas (separadas por vírgula)</span><textarea name="serviceAreas" defaultValue={settings.serviceAreas.join(", ")} rows={3} required /></label><label className="admin-field admin-field--full"><span>Mensagem de orçamento no WhatsApp</span><textarea name="quoteMessage" defaultValue={settings.quoteMessage} rows={3} required /></label><label className="admin-field admin-field--full"><span>Mensagem de recrutamento</span><textarea name="recruitmentMessage" defaultValue={settings.recruitmentMessage} rows={3} required /></label>
  </div><WorkspaceSubmit>Salvar configurações</WorkspaceSubmit></form></main>;
}
