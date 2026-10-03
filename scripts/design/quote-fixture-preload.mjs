// Explicit local-only rendering fixture; never imported by application code.
// Use only with `next start --hostname 127.0.0.1` and the flag below.
// Authentication/profile checks still reach the real backend. No record is inserted.
if (process.env.CASSEMIRO_DESIGN_QUOTE_FIXTURE !== "1") throw new Error("Explicit local fixture flag required.");
const actualFetch = globalThis.fetch;
const fixtures = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
];
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  const id = url.searchParams.get("id")?.replace(/^eq\./, "");
  if (url.hostname === "zjjepitczgffszbilfte.supabase.co" && url.pathname === "/rest/v1/quote_requests" && fixtures.includes(id)) {
    if (method !== "GET") throw new Error("Fixture is read-only.");
    const anonymized = id === fixtures[1];
    const fixture = {
      id, name: anonymized ? "Solicitação anonimizada" : "Solicitação de demonstração",
      phone: anonymized ? "" : "5515996101849", // Existing public business number; never contacted.
      city: anonymized ? "" : "Sorocaba / SP", work_type: "Reforma residencial",
      description: anonymized ? "" : "Exemplo local para verificar a leitura do briefing e a organização do atendimento.\n\nAtualização dos acabamentos, revisão das instalações e planejamento responsável das etapas da obra.",
      desired_start_date: "2026-11-01", source: "website", status: "Novo",
      created_at: id === fixtures[2] && process.env.CASSEMIRO_DESIGN_QUOTE_RECOVER !== "1" ? "invalid-local-error-fixture" : "2026-10-01T12:00:00Z", updated_at: "2026-10-02T12:00:00Z", last_contact_at: "2026-10-02T12:00:00Z",
      anonymized_at: anonymized ? "2026-10-03T12:00:00Z" : null,
      utm_source: null, utm_medium: null, utm_campaign: null,
    };
    return new Response(JSON.stringify(fixture), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
  return actualFetch(input, init);
};
