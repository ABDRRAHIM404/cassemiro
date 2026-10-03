"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";

export function PrivacyAnalytics() {
  const pathname = usePathname();
  if (process.env.NODE_ENV !== "production" || pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;
  return <Analytics beforeSend={(event) => {
    const path = new URL(event.url).pathname;
    return path.startsWith("/admin") || path.startsWith("/auth") ? null : event;
  }} />;
}
