import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import {
  heroDesktopFrames,
  heroDesktopPoster,
  heroMobileFrames,
  heroMobilePoster,
} from "@/config/hero";
import { HeroFrameSequence } from "./HeroFrameSequence";
import { defaultHomepageContent } from "@/lib/site-settings";
import { constructionServices } from "@/config/construction-services";
import styles from "./Hero.module.css";

export function Hero({ content = defaultHomepageContent }: { content?: typeof defaultHomepageContent }) {
  return (
    <section className={`${styles.root} hero ${heroDesktopFrames.length ? "hero--sequence" : ""}`} aria-labelledby="hero-title">
      <noscript>
        <style>{`
          .${styles.root}.hero--sequence { height: auto; }
          .${styles.root} .${styles.viewport} { position: relative; }
          .${styles.root} .hero-services, .${styles.root} .${styles.secondary}.hero__services-link { display: none; }
          .${styles.root} .${styles.secondary}.hero__reduced-services-link { display: inline-flex; }
          .${styles.root} .hero__reduced-stages { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; padding-block: 48px 64px; }
          .${styles.root} .hero__reduced-stages > div { border-top: 1px solid rgb(210 174 120 / 38%); padding-top: 17px; }
          .${styles.root} .hero__reduced-stages span { color: var(--bronze-light); font-size: 12px; }
          .${styles.root} .hero__reduced-stages h2 { margin: 13px 0 8px; font-family: var(--serif); font-size: 28px; font-weight: 400; }
          .${styles.root} .hero__reduced-stages p { color: #c5c4bc; font-size: 14px; line-height: 1.6; }
          @media (max-width: 700px) {
            .${styles.root} .hero__reduced-stages { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px 18px; padding-block: 36px 48px; }
            .${styles.root} .hero__reduced-stages h2 { font-size: 23px; }
          }
        `}</style>
      </noscript>
      <div className={styles.viewport}>
        <HeroFrameSequence
          desktopFrames={heroDesktopFrames}
          mobileFrames={heroMobileFrames}
          desktopPoster={heroDesktopPoster}
          mobilePoster={heroMobilePoster}
        />
        <div className={styles.veil} aria-hidden="true" />
        <div className={styles.copy}>
          <p className={styles.context}>{content.heroEyebrow}</p>
          <h1 id="hero-title" className={styles.heading}><span>{content.heroLineOne}</span>{" "}<span>{content.heroLineTwo}</span></h1>
          <p className={styles.intro}>{content.heroIntro}</p>
          <div className={styles.actions}>
            <Link href="#contato" className={styles.primary}>Solicitar orçamento <ArrowIcon /></Link>
            <Link href="#servicos" className={`${styles.secondary} hero__services-link`}>Conheça nossos serviços <ArrowIcon /></Link>
            <Link href="#etapas-estaticas" className={`${styles.secondary} hero__reduced-services-link`}>Conheça nossos serviços <ArrowIcon /></Link>
          </div>
        </div>
      </div>
      <div id="etapas-estaticas" className="hero__reduced-stages shell" aria-label="Etapas da construção">
        {constructionServices.map((service, index) => (
          <div key={service.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{service.title}</h2>
            <p>{service.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
