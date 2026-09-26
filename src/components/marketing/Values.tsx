import { values } from "@/config/site";

export function Values() {
  return (
    <section className="values section-pad" aria-labelledby="values-title">
      <div className="shell values__heading">
        <p className="eyebrow">O que permanece</p>
        <h2 id="values-title">Princípios firmes.<br /><em>Em cada projeto.</em></h2>
      </div>
      <div className="values__stack shell">
        {values.map((value, index) => (
          <article className="value-card" key={value.title} style={{ "--card-index": index } as React.CSSProperties}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{value.title}</h3>
            <p>{value.text}</p>
            <i aria-hidden="true" />
          </article>
        ))}
      </div>
    </section>
  );
}
