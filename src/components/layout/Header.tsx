"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import styles from "./Header.module.css";

export function Header({ showProjects = false }: { showProjects?: boolean }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
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
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 1000) setOpen(false);
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
      {open && <button type="button" className={styles.scrim} tabIndex={-1} aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <header className={styles.header} data-open={open} onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} onClick={() => setOpen(false)} aria-label="CASSEMIRO — início">
          <Logo />
        </Link>
        <nav id="primary-navigation" className={styles.nav} aria-label="Navegação principal">
          {links.map(([label, href]) => (
            <Link href={href} key={label} aria-current={pathname === href || (href !== "/" && !href.includes("#") && pathname.startsWith(`${href}/`)) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <Link className={styles.quote} href="/#contato" onClick={() => setOpen(false)}>
            Solicitar orçamento <span aria-hidden="true">↗</span>
          </Link>
        </nav>
        <button
          ref={toggleRef}
          className={styles.toggle}
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span /><span />
        </button>
        <noscript>
          <style>{`.${styles.toggle} { display: none; }`}</style>
          <details className={styles.fallbackMenu}>
            <summary>Menu</summary>
            <nav aria-label="Navegação principal sem JavaScript">
              {links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}
              <Link href="/#contato">Solicitar orçamento</Link>
            </nav>
          </details>
        </noscript>
      </div>
      </header>
    </>
  );
}
