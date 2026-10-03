import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { defaultHomepageContent } from "@/lib/site-settings";
import { ConstructionChapters } from "./ConstructionChapters";
import styles from "./Hero.module.css";

export function Hero({ content = defaultHomepageContent }: { content?: typeof defaultHomepageContent }) {
  return (
    <section className={styles.root} aria-labelledby="hero-title" data-construction-story>
      <ConstructionChapters>
        <div className={styles.copy}>
          <p className={styles.context}>{content.heroEyebrow}</p>
          <h1 id="hero-title" className={styles.heading}><span>{content.heroLineOne}</span>{" "}<span>{content.heroLineTwo}</span></h1>
          <p className={styles.intro}>{content.heroIntro}</p>
          <div className={styles.actions}>
            <Link href="#contato" className={styles.primary}>Solicitar orçamento <ArrowIcon /></Link>
            <Link href="#servicos" className={styles.secondary}>Conheça nossos serviços <ArrowIcon /></Link>
          </div>
        </div>
      </ConstructionChapters>
    </section>
  );
}
