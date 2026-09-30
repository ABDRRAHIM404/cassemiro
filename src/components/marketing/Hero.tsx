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

export function Hero({ content = defaultHomepageContent }: { content?: typeof defaultHomepageContent }) {
  return (
    <section className={`hero ${heroDesktopFrames.length ? "hero--sequence" : ""}`} aria-labelledby="hero-title">
      <div className="hero__sticky">
        <HeroFrameSequence
          desktopFrames={heroDesktopFrames}
          mobileFrames={heroMobileFrames}
          desktopPoster={heroDesktopPoster}
          mobilePoster={heroMobilePoster}
        />
        <div className="hero__veil" />
        <div className="hero__content shell">
          <p className="eyebrow">{content.heroEyebrow}</p>
          <h1 id="hero-title"><span>{content.heroLineOne}</span><span>{content.heroLineTwo}</span></h1>
          <p className="hero__intro">{content.heroIntro}</p>
          <div className="hero__actions">
            <Link href="#contato" className="button button--bronze">Solicitar orçamento <ArrowIcon /></Link>
            <Link href="#servicos" className="text-link">Conheça nossos serviços <ArrowIcon /></Link>
          </div>
        </div>
        <div className="hero__scroll" aria-hidden="true"><span>Role para construir</span><i /></div>
        <div className="hero__index" aria-hidden="true"><span>01</span><i /><span>06</span></div>
      </div>
    </section>
  );
}
