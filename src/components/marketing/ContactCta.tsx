import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { defaultBusinessSettings, defaultHomepageContent, type BusinessSettings, type HomepageContent } from "@/lib/site-settings";

const quoteMessage = "Olá, encontrei a CASSEMIRO pelo site e gostaria de solicitar um orçamento.";

export function ContactCta({ content = defaultHomepageContent, business = defaultBusinessSettings }: { content?: HomepageContent; business?: BusinessSettings }) {
  return (
    <section id="contato" className="contact" aria-labelledby="contact-title">
      <div className="contact__lines" aria-hidden="true"><i /><i /><i /></div>
      <div className="shell contact__content">
        <p className="eyebrow">{content.ctaEyebrow}</p>
        <h2 id="contact-title">{content.ctaTitle}</h2>
        <p>{content.ctaText}</p>
        <div className="contact__actions">
          <Link href="/contato" className="button button--bronze">Solicitar orçamento <ArrowIcon /></Link>
          <a href={`https://wa.me/${business.phoneE164}?text=${encodeURIComponent(business.quoteMessage || quoteMessage)}`} target="_blank" rel="noreferrer" className="button button--ghost">Falar no WhatsApp <ArrowIcon /></a>
        </div>
        <div className="contact__direct">
          <span>Prefere falar diretamente?</span>
          <a href={`tel:+${business.phoneE164}`}>{business.phoneDisplay}</a>
        </div>
      </div>
    </section>
  );
}
