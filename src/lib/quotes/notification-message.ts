import type { QuoteRequestInput } from "../../features/quotes/validation";
import { QUOTE_NOTIFICATION_EMAIL } from "./notification-config";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function quoteNotificationMessage(quote: QuoteRequestInput, saved: { id: string; created_at: string }) {
  const desiredDate = quote.desiredStart ? quote.desiredStart.split("-").reverse().join("/") : "Não informada";
  const submittedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "long", timeZone: "America/Sao_Paulo"
  }).format(new Date(saved.created_at));
  const fields = [
    ["Nome", quote.name], ["Telefone", quote.phone], ["Cidade", quote.city],
    ["Tipo de obra", quote.workType], ["Descrição", quote.description],
    ["Data desejada", desiredDate], ["Recebido em (horário de Brasília)", submittedAt]
  ];
  return {
    to: QUOTE_NOTIFICATION_EMAIL,
    subject: "CASSEMIRO — Nova solicitação de orçamento",
    text: `Nova solicitação de orçamento\n\n${fields.map(([label, value]) => `${label}: ${value}`).join("\n\n")}\n\nPainel: https://cassemiro-one.vercel.app/admin/orcamentos/${encodeURIComponent(saved.id)}`,
    html: `<h1>Nova solicitação de orçamento</h1>${fields.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong><br>${escapeHtml(value).replace(/\n/gu, "<br>")}</p>`).join("")}<p><a href="https://cassemiro-one.vercel.app/admin/orcamentos/${encodeURIComponent(saved.id)}">Abrir no painel</a></p>`
  };
}
