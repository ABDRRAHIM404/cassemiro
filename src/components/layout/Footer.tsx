import Link from "next/link";
import Image from "next/image";
import { defaultBusinessSettings, type BusinessSettings } from "@/lib/site-settings";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import styles from "./Footer.module.css";

export function Footer({ showProjects = false, settings = defaultBusinessSettings }: { showProjects?: boolean; settings?: BusinessSettings }) {
  return (
    <footer className={styles.root}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo} aria-label="CASSEMIRO Construções & Reformas — início">
            <Image
              src="/images/brand/client-logo-construcoes-dark-v1.png"
              alt="CASSEMIRO Construções & Reformas"
              width={1604}
              height={980}
              sizes="(max-width: 1000px) 92px, 105px"
              className={styles.clientLogo}
            />
          </Link>
          <p>Construção e reformas com experiência, cuidado e responsabilidade.</p>
        </div>
        <nav className={styles.explore} aria-label="Navegação do rodapé">
          <span>Explore</span>
          <Link href="/#sobre">Sobre <ArrowUpRight size={16} weight="thin" aria-hidden="true" /></Link>
          <Link href="/servicos">Serviços <ArrowUpRight size={16} weight="thin" aria-hidden="true" /></Link>
          {showProjects && <Link href="/projetos">Projetos <ArrowUpRight size={16} weight="thin" aria-hidden="true" /></Link>}
        </nav>
        <div className={styles.details}>
          <div><span>Fale conosco</span><a href={`tel:+${settings.phoneE164}`}>{settings.phoneDisplay}</a><a href={`mailto:${settings.email}`}>{settings.email}</a></div>
          {(settings.instagram || settings.facebook) && <div className={styles.social}>{settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={14} weight="thin" aria-hidden="true" /></a>}{settings.facebook && <a href={settings.facebook} target="_blank" rel="noreferrer">Facebook <ArrowUpRight size={14} weight="thin" aria-hidden="true" /></a>}</div>}
          <div className={styles.area}><span>Atendimento</span><p>{settings.serviceAreas.join(" · ")}</p><p>e região, em um raio aproximado de {settings.serviceRadiusKm} km.</p></div>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} {settings.legalName}</span>
        <Link href="/politica-de-privacidade">Política de privacidade</Link>
      </div>
    </footer>
  );
}
