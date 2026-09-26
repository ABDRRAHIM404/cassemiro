import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Administração", template: "%s | CASSEMIRO Admin" },
  robots: { index: false, follow: false, noarchive: true, nocache: true }
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
