import type { Json } from "@/types/supabase";
import { siteConfig } from "@/config/site";

export type SettingRow = { key: string; value: Json };
export type BusinessSettings = { legalName: string; phoneDisplay: string; phoneE164: string; email: string; cnpj: string; instagram: string; facebook: string; serviceAreas: string[]; serviceRadiusKm: number; quoteMessage: string; recruitmentMessage: string };
export type HomepageContent = { heroEyebrow: string; heroLineOne: string; heroLineTwo: string; heroIntro: string; aboutEyebrow: string; aboutTitle: string; aboutParagraphOne: string; aboutParagraphTwo: string; ctaEyebrow: string; ctaTitle: string; ctaText: string };

export const defaultBusinessSettings: BusinessSettings = {
  legalName: siteConfig.legalName, phoneDisplay: siteConfig.phoneDisplay, phoneE164: siteConfig.phoneE164,
  email: siteConfig.email, cnpj: "", instagram: "", facebook: "",
  serviceAreas: [...siteConfig.serviceAreas], serviceRadiusKm: 50,
  quoteMessage: "Olá, encontrei a CASSEMIRO pelo site e gostaria de solicitar um orçamento.",
  recruitmentMessage: "Olá, encontrei a CASSEMIRO pelo site e gostaria de saber sobre oportunidades para trabalhar com a equipe."
};

export const defaultHomepageContent: HomepageContent = {
  heroEyebrow: "Construções & Reformas · Sorocaba e região", heroLineOne: "Do alicerce", heroLineTwo: "ao acabamento.",
  heroIntro: "Experiência prática, execução responsável e cuidado em cada detalhe da sua obra.",
  aboutEyebrow: "Uma vida dedicada à construção", aboutTitle: "Construir certo é respeitar a confiança de quem contrata.",
  aboutParagraphOne: "Sérgio Cassemiro reúne mais de 43 anos de experiência prática na construção civil. Um conhecimento desenvolvido diretamente no canteiro, acompanhando de perto materiais, equipes, prazos e acabamentos.",
  aboutParagraphTwo: "Hoje, lidera uma empresa registrada e uma equipe enxuta, mantendo a proximidade e a responsabilidade que sempre definiram o seu trabalho.",
  ctaEyebrow: "Vamos construir juntos", ctaTitle: "Tem um projeto em mente?", ctaText: "Conte o que você precisa. Vamos conversar sobre a sua obra com clareza e responsabilidade."
};

function mapRows(rows: SettingRow[]) { return new Map(rows.map((row) => [row.key, row.value])); }
function stringValue(value: Json | undefined, fallback = "") { return typeof value === "string" ? value : fallback; }
function objectValue(value: Json | undefined) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : {}; }

export function parseBusinessSettings(rows: SettingRow[]) {
  const map = mapRows(rows); const phone = objectValue(map.get("phone"));
  const areas = map.get("service_areas"); const radius = map.get("service_radius_km");
  return {
    legalName: stringValue(map.get("legal_name"), defaultBusinessSettings.legalName),
    phoneDisplay: stringValue(phone.display, defaultBusinessSettings.phoneDisplay), phoneE164: stringValue(phone.e164, defaultBusinessSettings.phoneE164),
    email: stringValue(map.get("email"), defaultBusinessSettings.email), cnpj: stringValue(map.get("cnpj")),
    instagram: stringValue(map.get("instagram_url")), facebook: stringValue(map.get("facebook_url")),
    serviceAreas: Array.isArray(areas) ? areas.filter((item): item is string => typeof item === "string") : defaultBusinessSettings.serviceAreas,
    serviceRadiusKm: typeof radius === "number" ? radius : defaultBusinessSettings.serviceRadiusKm,
    quoteMessage: stringValue(map.get("quote_message"), defaultBusinessSettings.quoteMessage),
    recruitmentMessage: stringValue(map.get("recruitment_message"), defaultBusinessSettings.recruitmentMessage)
  };
}

export function parseHomepageContent(rows: SettingRow[]) {
  const value = objectValue(mapRows(rows).get("homepage_content"));
  return Object.fromEntries(Object.entries(defaultHomepageContent).map(([key, fallback]) => {
    const text = stringValue(value[key], fallback);
    // Update the previously stored default too, without overwriting custom copy.
    return [key, key === "heroEyebrow" && text === "Construção & Reformas · Sorocaba e região" ? fallback : text];
  })) as typeof defaultHomepageContent;
}
