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
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        {children}
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
