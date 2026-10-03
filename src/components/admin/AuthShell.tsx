import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import styles from "./AuthShell.module.css";

export function AuthShell({ children }: { children: ReactNode }) {
  return <main id="conteudo" className={styles.root}>
    <div className={styles.brand}>
      <Link href="/" aria-label="Voltar ao site" className={styles.logo}><Logo /></Link>
      <div className={styles.statement}>
        <p className={styles.context}>Área administrativa</p>
        <h1>A obra por trás do site.</h1>
        <p>Gerencie solicitações, serviços, projetos e conteúdo da CASSEMIRO.</p>
      </div>
    </div>
    <div className={styles.panel}>{children}</div>
  </main>;
}
