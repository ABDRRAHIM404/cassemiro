"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";

export function Header({ showProjects = false }: { showProjects?: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["Início", "/"],
    ["Sobre", "/#sobre"],
    ["Serviços", "/servicos"],
    ...(showProjects ? [["Projetos", "/projetos"]] : []),
    ["Contato", "/#contato"]
  ];

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 960) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [open]);

  return (
    <>
      {open && <button type="button" className="site-menu-scrim" tabIndex={-1} aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <header className={`site-header${open ? " site-header--open" : ""}`}>
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
    </>
  );
}
