"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { ClipboardText } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { Buildings } from "@phosphor-icons/react/dist/csr/Buildings";
import { Wrench } from "@phosphor-icons/react/dist/csr/Wrench";
import { Chats } from "@phosphor-icons/react/dist/csr/Chats";
import { Article } from "@phosphor-icons/react/dist/csr/Article";
import { GearSix } from "@phosphor-icons/react/dist/csr/GearSix";
import { List } from "@phosphor-icons/react/dist/csr/List";
import styles from "./AdminWorkspace.module.css";

const items = [
  { href: "/admin", label: "Visão geral", Icon: House },
  { href: "/admin/orcamentos", label: "Orçamentos", Icon: ClipboardText },
  { href: "/admin/projetos", label: "Projetos", Icon: Buildings },
  { href: "/admin/servicos", label: "Serviços", Icon: Wrench },
  { href: "/admin/depoimentos", label: "Depoimentos", Icon: Chats },
  { href: "/admin/conteudo", label: "Conteúdo", Icon: Article },
  { href: "/admin/configuracoes", label: "Configurações", Icon: GearSix },
];

export function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav className={styles.navigation} aria-label="Navegação administrativa">
    {items.map(({ href, label, Icon }) => <Link key={href} href={href} onClick={onNavigate}
      aria-current={pathname === href || href !== "/admin" && pathname.startsWith(`${href}/`) ? "page" : undefined}>
      <Icon size={20} weight="light" aria-hidden="true" /><span>{label}</span>
    </Link>)}
  </nav>;
}

export function AdminMobileNavigation() {
  const details = useRef<HTMLDetailsElement>(null);
  const close = () => { if (details.current) details.current.open = false; };
  return <details className={styles.mobileMenu} ref={details} onKeyDown={event => {
    if (event.key === "Escape") { close(); details.current?.querySelector("summary")?.focus(); }
  }}>
    <summary><List size={22} aria-hidden="true" /><span>Menu</span></summary>
    <div className={styles.mobilePanel}>
      <AdminNavigation onNavigate={close} />
      <Link className={styles.siteLink} href="/" onClick={close}>Ver site ↗</Link>
    </div>
  </details>;
}
