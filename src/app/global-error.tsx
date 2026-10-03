"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import styles from "./ErrorState.module.css";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html lang="pt-BR"><body className={styles.body}><main id="conteudo" className={styles.root}><div className={styles.content}><span className={styles.label}>ERRO INESPERADO</span><h1 className={styles.title}>Algo saiu do lugar.</h1><p className={styles.description}>Nossa equipe poderá verificar o problema. Tente novamente em instantes.</p><button className={styles.action} type="button" onClick={retry}>Tentar novamente</button></div></main></body></html>;
}
