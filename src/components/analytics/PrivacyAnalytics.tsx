"use client";

import { Analytics } from "@vercel/analytics/next";

export function PrivacyAnalytics() {
  return <Analytics beforeSend={(event) => {
    const path = new URL(event.url).pathname;
    return path.startsWith("/admin") || path.startsWith("/auth") ? null : event;
  }} />;
}
