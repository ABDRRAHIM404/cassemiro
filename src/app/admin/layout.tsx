import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: { default: "Administração", template: "%s | CASSEMIRO Admin" },
  robots: { index: false, follow: false, noarchive: true, nocache: true }
};

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  // Request-specific script nonces cannot be emitted by a static admin shell.
  await connection();
  return children;
}
