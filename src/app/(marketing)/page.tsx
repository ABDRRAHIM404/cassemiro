import { Authority } from "@/components/marketing/Authority";
import { ContactCta } from "@/components/marketing/ContactCta";
import { Hero } from "@/components/marketing/Hero";
import { ProcessScene } from "@/components/marketing/ProcessScene";
import { RotatingCatalog } from "@/components/marketing/RotatingCatalog";
import { SergioStory } from "@/components/marketing/SergioStory";
import { Values } from "@/components/marketing/Values";
import { Testimonials } from "@/components/marketing/Testimonials";
import { siteConfig } from "@/config/site";
import { createPublicClient } from "@/lib/supabase/public";
import { parseBusinessSettings, parseHomepageContent } from "@/lib/site-settings";

export default async function HomePage() {
  const supabase = createPublicClient();
  const [{ data: services }, { data: testimonials }, { data: settingsRows }] = await Promise.all([
    supabase.from("services").select("slug, title, short_description, content").eq("is_visible", true).order("sort_order"),
    supabase.from("testimonials").select("id, customer_name, text, rating, source").eq("is_approved", true).order("created_at", { ascending: false }),
    supabase.from("site_settings").select("key, value")
  ]);
  const homepageContent = parseHomepageContent(settingsRows ?? []);
  const businessSettings = parseBusinessSettings(settingsRows ?? []);
  const catalogServices = (services ?? []).map((service) => ({
    slug: service.slug,
    title: service.title,
    shortTitle: service.title.replace("Construção ", ""),
    description: service.short_description,
    details: service.content
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    name: siteConfig.name,
    legalName: businessSettings.legalName,
    telephone: `+${businessSettings.phoneE164}`,
    email: businessSettings.email,
    areaServed: businessSettings.serviceAreas.map((name) => ({ "@type": "City", name })),
    url: siteConfig.siteUrl,
    description: "Construção e reformas residenciais e comerciais, do alicerce ao acabamento."
  };

  return (
    <main id="conteudo">
      <Hero content={homepageContent} />
      <Authority />
      <RotatingCatalog items={catalogServices} />
      <ProcessScene />
      <Values />
      <SergioStory content={homepageContent} />
      <Testimonials items={testimonials ?? []} />
      <ContactCta content={homepageContent} business={businessSettings} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
