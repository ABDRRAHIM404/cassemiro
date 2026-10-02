"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { whatsappUrl } from "@/config/site";
import { parseBrazilianDate } from "@/features/quotes/date";
import { track } from "@vercel/analytics";

type QuoteData = { name: string; phone: string; city: string; workType: string; description: string; desiredStart: string };
const initialData: QuoteData = { name: "", phone: "", city: "", workType: "", description: "", desiredStart: "" };

export function QuoteForm({ whatsappPhone }: { whatsappPhone?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [data, setData] = useState(initialData);
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");
  const errors = {
    name: data.name.trim().length < 2,
    phone: data.phone.trim().length < 8,
    city: data.city.trim().length < 2,
    workType: data.workType === "",
    description: data.description.trim().length < 10,
    desiredStart: data.desiredStart.trim() !== "" && !parseBrazilianDate(data.desiredStart)
  };
  const valid = !Object.values(errors).some(Boolean);
  const message = useMemo(
    () => `Olá, sou ${data.name || "[nome]"}, de ${data.city || "[cidade]"}. Acabei de solicitar um orçamento pelo site para ${data.workType || "uma obra"} e gostaria de continuar o atendimento por aqui.`,
    [data]
  );
  const update = (field: keyof QuoteData, value: string) => setData((current) => ({ ...current, [field]: value }));
  const whatsAppLink = (text: string) => whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}` : whatsappUrl(text);

  return (
    <form
      ref={formRef}
      className="quote-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setAttempted(true);
        if (!valid) {
          const firstInvalid = (Object.keys(errors) as Array<keyof typeof errors>).find((field) => errors[field]);
          requestAnimationFrame(() => {
            const field = firstInvalid ? formRef.current?.elements.namedItem(firstInvalid) : null;
            if (field instanceof HTMLElement) field.focus();
          });
          return;
        }
        setStatus("submitting");
        setServerMessage("");

        const query = new URLSearchParams(window.location.search);
        const desiredStart = parseBrazilianDate(data.desiredStart) ?? "";
        fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            desiredStart,
            utmSource: query.get("utm_source"),
            utmMedium: query.get("utm_medium"),
            utmCampaign: query.get("utm_campaign"),
            company: ""
          })
        })
          .then(async (response) => {
            const result = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(result.error || "Não foi possível enviar a solicitação.");
            setStatus("success");
            track("quote_submitted", { work_type: data.workType });
          })
          .catch((error: unknown) => {
            setStatus("error");
            setServerMessage(error instanceof Error ? error.message : "Não foi possível enviar a solicitação.");
          });
      }}
    >
      {status === "success" ? (
        <div className="quote-success field--full" role="status">
          <span>Solicitação recebida</span>
          <h3>Obrigado, {data.name.split(" ")[0]}.</h3>
          <p>Seus dados foram registrados. Continue pelo WhatsApp se quiser agilizar a conversa.</p>
          <a href={whatsAppLink(message)} target="_blank" rel="noreferrer" className="button button--bronze" onClick={() => track("whatsapp_opened", { location: "quote_success" })}>Continuar no WhatsApp <ArrowIcon /></a>
        </div>
      ) : <>
      {attempted && !valid && <p className="quote-form__validation-summary field--full" role="alert">Revise os campos destacados antes de enviar.</p>}
      <div className="field">
        <label htmlFor="name">Nome</label>
        <input id="name" name="name" autoComplete="name" value={data.name} onChange={(e) => update("name", e.target.value)} aria-invalid={attempted && errors.name} aria-describedby={attempted && errors.name ? "name-error" : undefined} />
        {attempted && errors.name && <small id="name-error">Informe seu nome.</small>}
      </div>
      <div className="field">
        <label htmlFor="phone">Telefone / WhatsApp</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" value={data.phone} onChange={(e) => update("phone", e.target.value)} aria-invalid={attempted && errors.phone} aria-describedby={attempted && errors.phone ? "phone-error" : undefined} />
        {attempted && errors.phone && <small id="phone-error">Informe um telefone válido.</small>}
      </div>
      <div className="field">
        <label htmlFor="city">Cidade</label>
        <input id="city" name="city" autoComplete="address-level2" value={data.city} onChange={(e) => update("city", e.target.value)} aria-invalid={attempted && errors.city} aria-describedby={attempted && errors.city ? "city-error" : undefined} />
        {attempted && errors.city && <small id="city-error">Informe sua cidade.</small>}
      </div>
      <div className="field">
        <label htmlFor="workType">Tipo de obra</label>
        <select id="workType" name="workType" value={data.workType} onChange={(e) => update("workType", e.target.value)} aria-invalid={attempted && errors.workType} aria-describedby={attempted && errors.workType ? "workType-error" : undefined}>
          <option value="">Selecione</option><option>Construção residencial</option><option>Reforma</option><option>Construção comercial</option><option>Instalações</option><option>Acabamentos</option><option>Outro serviço</option>
        </select>
        {attempted && errors.workType && <small id="workType-error">Selecione o tipo de obra.</small>}
      </div>
      <div className="field field--full">
        <label htmlFor="description">Descrição do projeto</label>
        <textarea id="description" name="description" rows={5} value={data.description} onChange={(e) => update("description", e.target.value)} aria-invalid={attempted && errors.description} aria-describedby={attempted && errors.description ? "description-error" : undefined} placeholder="Conte um pouco sobre o espaço e o que você gostaria de fazer." />
        {attempted && errors.description && <small id="description-error">Conte um pouco mais sobre o projeto.</small>}
      </div>
      <div className="field field--full">
        <label htmlFor="desiredStart">Quando gostaria de começar? <span>Opcional</span></label>
        <input id="desiredStart" name="desiredStart" type="text" inputMode="numeric" autoComplete="off" maxLength={10} placeholder="DD/MM/AAAA" value={data.desiredStart} onChange={(e) => update("desiredStart", e.target.value)} aria-invalid={attempted && errors.desiredStart} aria-describedby={`desiredStart-hint${attempted && errors.desiredStart ? " desiredStart-error" : ""}`} />
        <small id="desiredStart-hint" className="field__hint">Use dia/mês/ano. Se preferir, deixe em branco.</small>
        {attempted && errors.desiredStart && <small id="desiredStart-error">Informe uma data válida no formato DD/MM/AAAA.</small>}
      </div>
      <div className="quote-form__footer field--full">
        <div aria-live="polite">
          <p>Seus dados serão usados somente para responder à solicitação.</p>
          {status === "error" && <p className="quote-form__error">{serverMessage} <a href={whatsAppLink(message)} target="_blank" rel="noreferrer">Abrir WhatsApp</a></p>}
        </div>
        <button type="submit" className="button button--bronze" disabled={status === "submitting"}>{status === "submitting" ? "Enviando…" : "Enviar solicitação"} <ArrowIcon /></button>
      </div>
      </>}
    </form>
  );
}
