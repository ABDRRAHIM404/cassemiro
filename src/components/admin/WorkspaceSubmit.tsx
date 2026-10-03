"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function WorkspaceSubmit({ children, className, disabled = false }: { children: ReactNode; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={disabled || pending} aria-busy={pending}>
    <span aria-live="polite">{pending ? "Salvando…" : children}</span>
  </button>;
}
