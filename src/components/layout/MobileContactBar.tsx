"use client";

import Link from "next/link";
import { defaultBusinessSettings, type BusinessSettings } from "@/lib/site-settings";
import { track } from "@vercel/analytics";

export function MobileContactBar({ settings = defaultBusinessSettings }: { settings?: BusinessSettings }) {
  return (
    <nav className="mobile-contact" aria-label="Contato rápido">
      <a href={`tel:+${settings.phoneE164}`} onClick={() => track("phone_clicked", { location: "mobile_bar" })}>Ligar</a>
      <a href={`https://wa.me/${settings.phoneE164}?text=${encodeURIComponent(settings.quoteMessage)}`} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_opened", { location: "mobile_bar" })}>WhatsApp</a>
      <Link href="/contato" onClick={() => track("quote_cta_clicked", { location: "mobile_bar" })}>Orçamento</Link>
    </nav>
  );
}
