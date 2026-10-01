import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { defaultBusinessSettings, type BusinessSettings } from "@/lib/site-settings";

export function Footer({ showProjects = false, settings = defaultBusinessSettings }: { showProjects?: boolean; settings?: BusinessSettings }) {
  return (
    <footer className="footer">
      <div className="footer__top shell">
        <div>
          <Logo />
          <p>Construção e reformas com experiência, cuidado e responsabilidade.</p>
        </div>
        <div className="footer__links">
          <div><span>Explore</span><Link href="/#sobre">Sobre</Link><Link href="/servicos">Serviços</Link>{showProjects && <Link href="/projetos">Projetos</Link>}</div>
          <div><span>Fale conosco</span><a href={`tel:+${settings.phoneE164}`}>{settings.phoneDisplay}</a><a href={`mailto:${settings.email}`}>{settings.email}</a>{settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer">Instagram ↗</a>}{settings.facebook && <a href={settings.facebook} target="_blank" rel="noreferrer">Facebook ↗</a>}</div>
          <div><span>Atendimento</span><p>{settings.serviceAreas.join(" · ")}</p><p>e região, em um raio aproximado de {settings.serviceRadiusKm} km.</p></div>
        </div>
      </div>
      <div className="footer__bottom shell">
        <span>© {new Date().getFullYear()} {settings.legalName}</span>
        <Link href="/politica-de-privacidade">Política de privacidade</Link>
      </div>
    </footer>
  );
}
