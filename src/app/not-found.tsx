import Link from "next/link";
import styles from "./ErrorState.module.css";

export default function NotFound() {
  return <main id="conteudo" className={styles.root}><div className={styles.content}><span className={styles.label}>404</span><h1 className={styles.title}>Página não encontrada.</h1><p className={styles.description}>Este caminho ainda não faz parte da obra.</p><Link href="/" className={styles.action}>Voltar ao início</Link></div></main>;
}
