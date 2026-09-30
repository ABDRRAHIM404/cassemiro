const pillars = [
  { title: "Qualidade", text: "Cuidado técnico até nos detalhes que não aparecem.", icon: "quality" },
  { title: "Prazos", text: "Planejamento claro e respeito por cada etapa.", icon: "time" },
  { title: "Experiência", text: "Decisões guiadas por mais de quatro décadas de obra.", icon: "experience" },
  { title: "Confiança", text: "Presença, transparência e responsabilidade do início ao fim.", icon: "trust" },
] as const;

function PillarIcon({ type }: { type: typeof pillars[number]["icon"] }) {
  if (type === "quality") return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5 40 14v20L24 43 8 34V14L24 5Z"/><path d="m16 24 5 5 11-12"/></svg>;
  if (type === "time") return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="25" r="17"/><path d="M24 14v12l8 5M18 5h12"/></svg>;
  if (type === "experience") return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 39h32M12 39V20l12-9 12 9v19M19 39V27h10v12"/><path d="M7 20 24 7l17 13"/></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 43S39 35 39 20V10L24 5 9 10v10c0 15 15 23 15 23Z"/><path d="m17 24 5 5 10-11"/></svg>;
}

export function WhyCassemiro() {
  return (
    <section className="why" aria-labelledby="why-title">
      <div className="why__image" aria-hidden="true" />
      <div className="why__shade" aria-hidden="true" />
      <div className="shell why__content">
        <div className="why__heading">
          <p className="eyebrow">Um compromisso em cada etapa</p>
          <h2 id="why-title">Por que escolher<br />a <em>CASSEMIRO?</em></h2>
        </div>
        <div className="why__pillars">
          {pillars.map((pillar, index) => (
            <article key={pillar.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <PillarIcon type={pillar.icon} />
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
