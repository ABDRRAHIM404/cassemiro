import type { Metadata } from "next";
import { ContactCta } from "@/components/marketing/ContactCta";
import { Hero } from "@/components/marketing/Hero";
import { ProjectsJourney } from "@/components/marketing/ProjectsJourney";
import { SergioStory } from "@/components/marketing/SergioStory";
import { Testimonials } from "@/components/marketing/Testimonials";
import { WhyCassemiro } from "@/components/marketing/WhyCassemiro";
import { siteConfig } from "@/config/site";
import { serializeJsonLd } from "@/lib/json-ld";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { parseBusinessSettings, parseHomepageContent } from "@/lib/site-settings";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const supabase = createPublicClient();
  const [testimonialsResult, settingsResult, projectsResult] = await Promise.all([
    supabase.from("testimonials").select("id, customer_name, text, rating, source").eq("is_approved", true).order("created_at", { ascending: false }),
    supabase.from("site_settings").select("key, value"),
    supabase.from("projects").select("id, slug, title, city, category, hero_image").eq("is_published", true).order("created_at", { ascending: false })
  ]);
  const testimonials = requirePublicData(testimonialsResult, "home testimonials");
  const settingsRows = requirePublicData(settingsResult, "home settings");
  const projects = requirePublicData(projectsResult, "home projects");
  const homepageContent = parseHomepageContent(settingsRows ?? []);
  const businessSettings = parseBusinessSettings(settingsRows ?? []);
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
      <SergioStory content={homepageContent} />
      <WhyCassemiro imageUrl={projects?.find((project) => project.hero_image)?.hero_image} />
      <ProjectsJourney items={projects ?? []} />
      <Testimonials items={testimonials ?? []} />
      <ContactCta content={homepageContent} business={businessSettings} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    </main>
  );
}
