"use client";

import { useState } from "react";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Quotes } from "@phosphor-icons/react/dist/csr/Quotes";
import { Star } from "@phosphor-icons/react/dist/csr/Star";
import { Reveal } from "@/components/motion/Reveal";
import styles from "./Testimonials.module.css";

type Testimonial = { id: string; customer_name: string; text: string; rating: number | null; source: string | null };

export function Testimonials({ items }: { items: Testimonial[] }) {
  const [active, setActive] = useState(0);
  if (!items.length) return null;
  const item = items[active];
  const select = (index: number) => setActive((index + items.length) % items.length);
  return (
    <section id="depoimentos" className={styles.root} aria-labelledby="testimonials-title">
      <div className={styles.composition}>
        <Reveal className={styles.heading}>
          <p>Quem já construiu conosco</p>
          <h2 id="testimonials-title">Confiança que vira recomendação.</h2>
        </Reveal>
        <div className={styles.story}>
          <Quotes className={styles.quoteMark} size={44} weight="thin" aria-hidden="true" />
          <article key={item.id} className={styles.quote} aria-live="polite" aria-atomic="true">
            <blockquote>“{item.text}”</blockquote>
            <footer><strong>{item.customer_name}</strong>{item.source && <span>{item.source}</span>}</footer>
            {item.rating != null && item.rating > 0 && <div className={styles.rating} role="img" aria-label={`${item.rating} de 5 estrelas`}>
              {Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} weight={index < (item.rating ?? 0) ? "fill" : "thin"} aria-hidden="true" />)}
            </div>}
          </article>
          {items.length > 1 && <div className={styles.controls} role="group" aria-label="Navegar pelos depoimentos">
            <button type="button" onClick={() => select(active - 1)} aria-label="Depoimento anterior"><CaretLeft size={24} weight="thin" aria-hidden="true" /></button>
            <span>{String(active + 1).padStart(2, "0")} <i aria-hidden="true">/</i> {String(items.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => select(active + 1)} aria-label="Próximo depoimento"><CaretRight size={24} weight="thin" aria-hidden="true" /></button>
          </div>}
        </div>
      </div>
    </section>
  );
}
