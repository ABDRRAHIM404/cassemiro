"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { Moon } from "@phosphor-icons/react/dist/csr/Moon";
import { Sun } from "@phosphor-icons/react/dist/csr/Sun";
import { getAdminTheme, getServerAdminTheme, setAdminTheme, subscribeAdminTheme, type AdminTheme as Theme } from "./admin-theme";
import styles from "./AdminWorkspace.module.css";

const ThemeContext = createContext<Theme>("light");

export function AdminTheme({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeAdminTheme, getAdminTheme, getServerAdminTheme);
  return <ThemeContext.Provider value={theme}>
    <div className={styles.root} data-admin-theme={theme}>{children}</div>
  </ThemeContext.Provider>;
}

export function AdminThemeToggle() {
  const theme = useContext(ThemeContext);
  const dark = theme === "dark";
  return <button type="button" className={styles.themeToggle} role="switch"
    aria-label="Modo escuro" aria-checked={dark}
    title={dark ? "Ativar modo claro" : "Ativar modo escuro"}
    onClick={() => setAdminTheme(dark ? "light" : "dark")}>
    {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    <span>{dark ? "Modo claro" : "Modo escuro"}</span>
  </button>;
}
