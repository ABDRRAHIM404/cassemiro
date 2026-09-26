import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileContactBar } from "@/components/layout/MobileContactBar";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { createPublicClient } from "@/lib/supabase/public";
import { parseBusinessSettings } from "@/lib/site-settings";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const supabase = createPublicClient();
  const [{ count }, { data: settingRows }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("site_settings").select("key, value")
  ]);
  const showProjects = Boolean(count);
  const settings = parseBusinessSettings(settingRows ?? []);

  return (
    <SmoothScrollProvider>
      <Header showProjects={showProjects} />
      {children}
      <Footer showProjects={showProjects} settings={settings} />
      <MobileContactBar settings={settings} />
    </SmoothScrollProvider>
  );
}
