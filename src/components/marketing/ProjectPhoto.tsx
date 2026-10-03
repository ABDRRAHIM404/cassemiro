import Image from "next/image";
import styles from "./ProjectPhoto.module.css";

export function ProjectPhoto({ src, alt, sizes = "(max-width: 760px) calc(100vw - 40px), (max-width: 1300px) calc(100vw - 144px), 1160px", className = "", preload = false }: { src: string | null; alt: string; sizes?: string; className?: string; preload?: boolean }) {
  return <div className={`${styles.frame} ${className}`}>
    {src ? <Image src={src} alt={alt} fill sizes={sizes} preload={preload} unoptimized={src.startsWith("/api/project-media/")} /> : <p className={styles.empty}>Registro fotográfico em preparação</p>}
  </div>;
}
