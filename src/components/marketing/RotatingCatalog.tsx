"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { services as fallbackServices } from "@/config/site";

export type CatalogService = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  details: string;
};

export function RotatingCatalog({ items }: { items?: CatalogService[] }) {
  const services: CatalogService[] = items?.length ? items : fallbackServices.map((item) => ({ ...item, slug: item.title === "Reformas" ? "reformas" : item.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }));
  const [active, setActive] = useState(0);
  const select = (index: number) => setActive((index + services.length) % services.length);
  const service = services[active];

  return (
    <section id="servicos" className="services-scene section-pad" aria-labelledby="services-title">
      <div className="shell services-scene__heading">
        <p className="eyebrow">O que construímos</p>
        <h2 id="services-title">Uma obra inteira.<br /><em>Um só compromisso.</em></h2>
        <p>Do trabalho estrutural aos últimos detalhes, coordenamos cada etapa com o mesmo padrão de cuidado.</p>
      </div>
      <div
        className="catalog shell"
        tabIndex={0}
        aria-label="Catálogo de serviços. Use as setas para navegar."
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); select(active + 1); }
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); select(active - 1); }
        }}
        onWheel={(event) => {
          if (Math.abs(event.deltaY) > 20) select(active + (event.deltaY > 0 ? 1 : -1));
        }}
      >
        <div className="catalog__stage" aria-hidden="true">
          {services.map((item, index) => {
            const offset = index - active;
            const normalized = offset > services.length / 2 ? offset - services.length : offset < -services.length / 2 ? offset + services.length : offset;
            return (
              <button
                type="button"
                key={item.title}
                className={`catalog__rail-item ${index === active ? "is-active" : ""}`}
                style={{ "--offset": normalized } as React.CSSProperties}
                onClick={() => select(index)}
                tabIndex={-1}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>{item.shortTitle}
              </button>
            );
          })}
        </div>
        <article className="catalog__detail" aria-live="polite">
          <span className="catalog__number">{String(active + 1).padStart(2, "0")}</span>
          <div>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <small>{service.details}</small>
            <Link href={`/servicos/${service.slug}`}>Conhecer serviço →</Link>
          </div>
        </article>
        <div className="catalog__controls">
          <button type="button" onClick={() => select(active - 1)} aria-label="Serviço anterior"><ArrowIcon /></button>
          <span>{String(active + 1).padStart(2, "0")} / {String(services.length).padStart(2, "0")}</span>
          <button type="button" onClick={() => select(active + 1)} aria-label="Próximo serviço"><ArrowIcon /></button>
        </div>
      </div>
    </section>
  );
}
