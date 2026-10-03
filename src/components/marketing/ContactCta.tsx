import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { defaultBusinessSettings, defaultHomepageContent, type BusinessSettings, type HomepageContent } from "@/lib/site-settings";
import { Phone } from "@phosphor-icons/react/dist/ssr/Phone";
import { Reveal } from "@/components/motion/Reveal";
import styles from "./ContactCta.module.css";

const quoteMessage = "Olá, encontrei a CASSEMIRO pelo site e gostaria de solicitar um orçamento.";

export function ContactCta({ content = defaultHomepageContent, business = defaultBusinessSettings }: { content?: HomepageContent; business?: BusinessSettings }) {
  return (
    <section id="contato" className={styles.root} aria-labelledby="contact-title">
      <div className={styles.drawing} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.shell}>
        <Reveal className={styles.content}>
          <p className={styles.context}>{content.ctaEyebrow}</p>
          <h2 id="contact-title">{content.ctaTitle}</h2>
          <p className={styles.description}>{content.ctaText}</p>
          <div className={styles.actions}>
            <Link href="/contato" className={styles.primary}>Solicitar orçamento <ArrowIcon /></Link>
            <a href={`https://wa.me/${business.phoneE164}?text=${encodeURIComponent(business.quoteMessage || quoteMessage)}`} target="_blank" rel="noreferrer" className={styles.secondary}>Falar no WhatsApp <ArrowIcon /></a>
          </div>
          <div className={styles.direct}>
            <Phone size={24} weight="thin" aria-hidden="true" />
            <div><span>Prefere falar diretamente?</span><a href={`tel:+${business.phoneE164}`}>{business.phoneDisplay}</a></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
