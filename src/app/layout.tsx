import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { PrivacyAnalytics } from "@/components/analytics/PrivacyAnalytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: { default: "CASSEMIRO | Construção e Reformas em Sorocaba", template: "%s | CASSEMIRO" },
  description: "Construção e reformas residenciais e comerciais em Sorocaba e região. Mais de 43 anos de experiência prática, do alicerce ao acabamento.",
  applicationName: "CASSEMIRO",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "CASSEMIRO — Construção & Reformas",
    description: "Experiência prática, execução responsável e cuidado em cada detalhe da sua obra.",
    siteName: "CASSEMIRO"
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e0e0e" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <script id="hero-early-wheel" dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('wheel', function (event) {
            if (window.matchMedia('(max-width: 767px), (orientation: portrait) and (max-width: 1024px)').matches ||
                window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                navigator.connection?.saveData ||
                (navigator.deviceMemory <= 1 && navigator.hardwareConcurrency <= 2)) return;
            var hero = document.querySelector('.hero--sequence');
            if (!hero || hero.dataset.sequenceReady === 'true' || hero.dataset.sequenceReady === 'failed') return;
            var rect = hero.getBoundingClientRect();
            var height = window.visualViewport?.height || window.innerHeight;
            if (rect.top > 1 || rect.bottom < height - 1) return;
            event.preventDefault();
            if (window.__cassemiroEarlyWheelHero !== hero) {
              window.clearTimeout(window.__cassemiroEarlyWheelTimer);
              window.__cassemiroEarlyWheelTimer = 0;
              window.__cassemiroEarlyWheel = 0;
              window.__cassemiroEarlyWheelHero = hero;
            }
            if (!window.__cassemiroEarlyWheelTimer) {
              window.__cassemiroEarlyWheelTimer = window.setTimeout(function () {
                window.__cassemiroEarlyWheelTimer = 0;
                if (!hero.isConnected || window.__cassemiroEarlyWheelHero !== hero) return;
                if (hero.dataset.sequenceReady === 'true') return;
                var queued = window.__cassemiroEarlyWheel || 0;
                delete window.__cassemiroEarlyWheel;
                hero.dataset.sequenceReady = 'failed';
                window.scrollBy(0, Math.sign(queued) * Math.min(Math.abs(queued), window.innerHeight));
              }, 8000);
            }
            window.__cassemiroEarlyWheel = (window.__cassemiroEarlyWheel || 0) + event.deltaY;
          }, { passive: false });
        ` }} />
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        {children}
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
