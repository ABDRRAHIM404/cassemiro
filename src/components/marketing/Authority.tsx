import { Reveal } from "@/components/motion/Reveal";

export function Authority() {
  return (
    <section className="authority section-pad" aria-labelledby="authority-title">
      <div className="authority__line" aria-hidden="true" />
      <div className="shell authority__grid">
        <Reveal className="authority__number">
          <span>+</span>43
          <small>anos de experiência prática</small>
        </Reveal>
        <Reveal className="authority__copy">
          <p className="eyebrow eyebrow--dark">Experiência que constrói confiança</p>
          <h2 id="authority-title">Conhecimento construído <em>no canteiro.</em></h2>
          <p>Mais de quatro décadas acompanhando cada etapa de uma obra ensinaram o que realmente importa: fazer certo, usar materiais com consciência e respeitar a confiança do cliente.</p>
          <div className="authority__principles">
            <span>Precisão</span><span>Responsabilidade</span><span>Respeito aos prazos</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
