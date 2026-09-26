"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import type { ReactNode } from "react";

export function TrackedLink({ href, eventName, data, className, children, external = false }: { href: string; eventName: string; data?: Record<string, string | number | boolean | null>; className?: string; children: ReactNode; external?: boolean }) {
  const onClick = () => track(eventName, data);
  return external ? <a href={href} className={className} target="_blank" rel="noreferrer" onClick={onClick}>{children}</a> : <Link href={href} className={className} onClick={onClick}>{children}</Link>;
}
