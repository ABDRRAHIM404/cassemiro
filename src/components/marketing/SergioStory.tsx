import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { defaultHomepageContent } from "@/lib/site-settings";

export function SergioStory({ content = defaultHomepageContent }: { content?: typeof defaultHomepageContent }) {
  return (
    <section id="sobre" className="story section-pad" aria-labelledby="story-title">
      <div className="story__word" aria-hidden="true">EXPERIÊNCIA</div>
      <div className="shell story__grid">
        <div className="story__portrait-wrap">
          <div className="story__portrait-frame">
            <Image
              src="/images/references/sergio-portrait-original.jpg"
              alt="Sérgio Cassemiro em uma obra"
              fill
              sizes="(max-width: 760px) 88vw, 42vw"
              className="story__portrait"
            />
          </div>
          <span className="story__caption">Sérgio Cassemiro<br />Fundador · CASSEMIRO</span>
        </div>
        <Reveal className="story__copy">
          <p className="eyebrow">{content.aboutEyebrow}</p>
          <h2 id="story-title">“{content.aboutTitle}”</h2>
          <p>{content.aboutParagraphOne}</p>
          <p>{content.aboutParagraphTwo}</p>
          <div className="story__signature">Sérgio Cassemiro</div>
        </Reveal>
      </div>
    </section>
  );
}
