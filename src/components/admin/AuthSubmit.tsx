"use client";

import { useFormStatus } from "react-dom";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import styles from "./AuthShell.module.css";

export function AuthSubmit({ label, pendingLabel, secondary = false }: { label: string; pendingLabel: string; secondary?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={`${styles.submit} ${secondary ? styles.secondary : ""}`} disabled={pending} aria-busy={pending}>
    {pending && <CircleNotch className={styles.spinner} size={18} aria-hidden="true" />}
    <span aria-live="polite">{pending ? pendingLabel : label}</span>
  </button>;
}
