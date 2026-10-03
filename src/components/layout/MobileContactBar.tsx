"use client";

import Link from "next/link";
import { defaultBusinessSettings, type BusinessSettings } from "@/lib/site-settings";
import { track } from "@vercel/analytics";
import { Phone } from "@phosphor-icons/react/dist/csr/Phone";
import { WhatsappLogo } from "@phosphor-icons/react/dist/csr/WhatsappLogo";
import { NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import styles from "./MobileContactBar.module.css";

export function MobileContactBar({ settings = defaultBusinessSettings }: { settings?: BusinessSettings }) {
  return (
    <nav className={styles.root} aria-label="Contato rápido">
      <a href={`tel:+${settings.phoneE164}`} onClick={() => track("phone_clicked", { location: "mobile_bar" })}><Phone size={17} weight="light" aria-hidden="true" />Ligar</a>
      <a href={`https://wa.me/${settings.phoneE164}?text=${encodeURIComponent(settings.quoteMessage)}`} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_opened", { location: "mobile_bar" })}><WhatsappLogo size={18} weight="light" aria-hidden="true" />WhatsApp</a>
      <Link href="/contato" onClick={() => track("quote_cta_clicked", { location: "mobile_bar" })}><NotePencil size={17} weight="light" aria-hidden="true" />Orçamento</Link>
    </nav>
  );
}
