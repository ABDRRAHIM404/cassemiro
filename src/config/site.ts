export const siteConfig = {
  name: "CASSEMIRO",
  descriptor: "Construções & Reformas",
  slogan: "Do alicerce ao acabamento.",
  legalName: "Cassemiro Construções LTDA",
  phoneDisplay: "(15) 99610-1849",
  phoneE164: "5515996101849",
  email: "Cassemiro.obras@gmail.com",
  serviceAreas: ["Sorocaba", "Votorantim", "Itu", "Porto Feliz"],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
} as const;

export const services = [
  {
    number: "01",
    title: "Construção Residencial",
    shortTitle: "Residencial",
    description: "Casas construídas com planejamento, precisão e cuidado em cada etapa — da fundação à entrega.",
    details: "Casas completas · ampliações · piscinas"
  },
  {
    number: "02",
    title: "Reformas",
    shortTitle: "Reformas",
    description: "Transformações completas ou pontuais, com respeito ao espaço, ao orçamento e à rotina do cliente.",
    details: "Reformas completas · cozinhas · banheiros"
  },
  {
    number: "03",
    title: "Construção Comercial",
    shortTitle: "Comercial",
    description: "Execução responsável para espaços comerciais funcionais, duráveis e prontos para receber negócios.",
    details: "Lojas · escritórios · adequações"
  },
  {
    number: "04",
    title: "Alvenaria e Estruturas",
    shortTitle: "Estruturas",
    description: "A base que sustenta todo o projeto, executada com experiência prática e atenção técnica.",
    details: "Fundações · concreto · alvenaria · telhados"
  },
  {
    number: "05",
    title: "Instalações",
    shortTitle: "Instalações",
    description: "Soluções elétricas e hidráulicas integradas à obra para segurança, eficiência e fácil manutenção.",
    details: "Elétrica · hidráulica · drywall"
  },
  {
    number: "06",
    title: "Acabamentos",
    shortTitle: "Acabamentos",
    description: "A precisão dos últimos detalhes, onde materiais, textura e execução definem o resultado final.",
    details: "Pisos · revestimentos · pintura"
  }
] as const;

export const processStages = [
  { number: "01", title: "Planejar", text: "Entender o espaço, o objetivo e cada decisão antes de começar." },
  { number: "02", title: "Preparar", text: "Organizar materiais, equipe e canteiro para uma execução eficiente." },
  { number: "03", title: "Construir", text: "Conduzir cada etapa com técnica, responsabilidade e atenção aos detalhes." },
  { number: "04", title: "Finalizar", text: "Cuidar dos acabamentos e entregar um espaço pronto para novas histórias." }
] as const;

export const values = [
  { title: "Qualidade", text: "Fazer bem feito, mesmo nos detalhes que quase ninguém vê." },
  { title: "Eficiência", text: "Usar tempo e materiais com consciência, evitando desperdícios." },
  { title: "Integridade", text: "Trabalhar com honestidade, transparência e respeito." },
  { title: "Compromisso", text: "Assumir cada projeto com seriedade, do início à entrega." },
  { title: "Responsabilidade", text: "Respeitar acordos, prazos e a confiança de cada cliente." }
] as const;

export function whatsappUrl(message: string) {
  return `https://wa.me/${siteConfig.phoneE164}?text=${encodeURIComponent(message)}`;
}
