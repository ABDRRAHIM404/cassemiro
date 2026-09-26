import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { logout } from "@/app/admin/actions";

const navigation = [
  { href: "/admin", label: "Visão geral", mark: "01" },
  { href: "/admin/orcamentos", label: "Orçamentos", mark: "02" },
  { href: "/admin/projetos", label: "Projetos", mark: "03" },
  { href: "/admin/servicos", label: "Serviços", mark: "04" },
  { href: "/admin/depoimentos", label: "Depoimentos", mark: "05" },
  { href: "/admin/conteudo", label: "Conteúdo", mark: "06" },
  { href: "/admin/configuracoes", label: "Configurações", mark: "07" }
] as const;

export function AdminShell({ children, displayName, email }: { children: ReactNode; displayName: string; email: string }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-sidebar__logo"><Logo /></Link>
        <nav aria-label="Navegação administrativa">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}><span>{item.mark}</span>{item.label}</Link>
          ))}
        </nav>
        <div className="admin-sidebar__coming"><span>Sistema</span><p>Conteúdo e operação em um só lugar.</p></div>
        <Link href="/" className="admin-sidebar__site">Ver site ↗</Link>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div><strong>{displayName}</strong><span>{email}</span></div>
          <form action={logout}><button type="submit">Sair</button></form>
        </header>
        {children}
      </div>
    </div>
  );
}
