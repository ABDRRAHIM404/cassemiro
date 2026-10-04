import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { logout } from "@/app/admin/actions";
import { AdminNavigation, AdminMobileNavigation } from "./AdminNavigation";
import { AdminTheme, AdminThemeToggle } from "./AdminTheme";
import styles from "./AdminWorkspace.module.css";

export function AdminShell({ children, displayName, email }: { children: ReactNode; displayName: string; email: string }) {
  return (
    <AdminTheme>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.logo}><Logo /></Link>
        <AdminNavigation />
        <div className={styles.sidebarNote}><span>Administração</span><p>Conteúdo e operação em um só lugar.</p></div>
        <Link href="/" className={styles.siteLink}>Ver site <span aria-hidden="true">↗</span></Link>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <AdminMobileNavigation />
          <div className={styles.identity}><strong>{displayName}</strong><span title={email}>{email}</span></div>
          <AdminThemeToggle />
          <form action={logout}><button type="submit">Sair</button></form>
        </header>
        {children}
      </div>
    </AdminTheme>
  );
}
