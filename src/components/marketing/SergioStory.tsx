import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { defaultHomepageContent } from "@/lib/site-settings";
import styles from "./SergioStory.module.css";

export function SergioStory({ content = defaultHomepageContent }: { content?: typeof defaultHomepageContent }) {
  return (
    <section id="sobre" className={styles.root} aria-labelledby="story-title">
      <div className={styles.portraitLayer}>
        <Image src="/images/references/sergio-portrait-original.jpg" alt="Sérgio Cassemiro em uma obra" fill sizes="(max-width: 760px) 100vw, 54vw" className={styles.portrait} />
      </div>
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.composition}>
        <Reveal className={styles.copy}>
          <p className={styles.context}>{content.aboutEyebrow}</p>
          <h2 id="story-title">Sérgio<br />Cassemiro</h2>
          <p className={styles.role}>Fundador e empreiteiro de obras</p>
          <p className={styles.experience}><strong>43+</strong><span>anos de<br />experiência</span></p>
          <div className={styles.body}>
            <p>{content.aboutParagraphOne}</p>
            <p>{content.aboutParagraphTwo}</p>
          </div>
          <blockquote className={styles.quote}>“{content.aboutTitle}”</blockquote>
        </Reveal>
      </div>
    </section>
  );
}
