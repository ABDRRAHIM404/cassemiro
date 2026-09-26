"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";

export function Header({ showProjects = false }: { showProjects?: boolean }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const links = [
    ["Início", "/"],
    ["Sobre", "/#sobre"],
    ["Serviços", "/servicos"],
    ...(showProjects ? [["Projetos", "/projetos"]] : []),
    ["Contato", "/#contato"]
  ];

  useEffect(() => {
    const update = () => setSolid(window.scrollY > window.innerHeight * 0.55);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`site-header ${solid ? "site-header--solid" : ""} ${open ? "site-header--open" : ""}`}>
      <div className="site-header__inner shell">
        <Link href="/" className="site-header__logo" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav id="primary-navigation" className="site-nav" aria-label="Navegação principal">
          {links.map(([label, href]) => (
            <Link href={href} key={label} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <Link className="button button--small button--outline" href="/#contato" onClick={() => setOpen(false)}>
            Solicitar orçamento
          </Link>
        </nav>
        <button
          className="menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span /><span />
        </button>
      </div>
    </header>
  );
}
