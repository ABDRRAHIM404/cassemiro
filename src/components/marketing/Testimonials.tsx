"use client";

import { useState } from "react";

type Testimonial = { id: string; customer_name: string; text: string; rating: number | null; source: string | null };

export function Testimonials({ items }: { items: Testimonial[] }) {
  const [active, setActive] = useState(0);
  if (!items.length) return null;
  const item = items[active];
  const select = (index: number) => setActive((index + items.length) % items.length);
  return <section className="testimonials" aria-labelledby="testimonials-title"><div className="shell testimonials__grid"><div><p className="eyebrow">Quem já construiu conosco</p><h2 id="testimonials-title">Confiança que<br /><em>vira recomendação.</em></h2><div className="testimonials__controls"><button type="button" onClick={() => select(active - 1)} aria-label="Depoimento anterior">←</button><span>{String(active + 1).padStart(2,"0")} / {String(items.length).padStart(2,"0")}</span><button type="button" onClick={() => select(active + 1)} aria-label="Próximo depoimento">→</button></div></div><article aria-live="polite"><span aria-label={item.rating ? `${item.rating} de 5 estrelas` : undefined}>{item.rating ? "★".repeat(item.rating) : "CASSEMIRO"}</span><blockquote>“{item.text}”</blockquote><footer><strong>{item.customer_name}</strong>{item.source && <small>{item.source}</small>}</footer></article></div></section>;
}
