import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileContactBar } from "@/components/layout/MobileContactBar";
import { SmoothAnchorNavigation } from "@/components/layout/SmoothAnchorNavigation";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePublicData } from "@/lib/supabase/require-public-data";
import { parseBusinessSettings } from "@/lib/site-settings";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const supabase = createPublicClient();
  const [projectsResult, settingsResult] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("site_settings").select("key, value")
  ]);
  const count = requirePublicData({ data: projectsResult.count, error: projectsResult.error }, "marketing project count");
  const settingRows = requirePublicData(settingsResult, "marketing settings");
  const showProjects = Boolean(count);
  const settings = parseBusinessSettings(settingRows ?? []);

  return (
    <>
      <Header showProjects={showProjects} />
      {children}
      <Footer showProjects={showProjects} settings={settings} />
      <MobileContactBar settings={settings} />
      <SmoothAnchorNavigation />
    </>
  );
}
