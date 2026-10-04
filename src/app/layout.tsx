import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { siteConfig } from "@/config/site";
import { PrivacyAnalytics } from "@/components/analytics/PrivacyAnalytics";
import { socialMetadata } from "@/lib/seo";
import "./globals.css";

const sans = localFont({ src: "./fonts/dm-sans.woff2", weight: "100 1000", display: "swap", variable: "--font-sans" });
const display = localFont({ src: "./fonts/dm-serif-display.woff2", weight: "400", display: "swap", variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: { default: "CASSEMIRO | Construção e Reformas em Sorocaba", template: "%s | CASSEMIRO" },
  description: "Construção e reformas residenciais e comerciais em Sorocaba e região. Mais de 43 anos de experiência prática, do alicerce ao acabamento.",
  applicationName: "CASSEMIRO",
  ...socialMetadata("CASSEMIRO — Construção & Reformas", "Experiência prática, execução responsável e cuidado em cada detalhe da sua obra."),
  robots: { index: true, follow: true }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e0e0e" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body>
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        {children}
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
