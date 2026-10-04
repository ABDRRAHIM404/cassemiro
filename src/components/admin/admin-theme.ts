export type AdminTheme = "light" | "dark";

const storageKey = "cassemiro-admin-theme-v1";
const changeEvent = "cassemiro-admin-theme-change";
let fallbackTheme: AdminTheme = "light";
let storageUnavailable = false;

export function getAdminTheme(): AdminTheme {
  if (storageUnavailable) return fallbackTheme;
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved === "dark" || saved === "light" ? saved : fallbackTheme;
  } catch {
    return fallbackTheme;
  }
}

export function getServerAdminTheme(): AdminTheme {
  return "light";
}

export function setAdminTheme(theme: AdminTheme) {
  fallbackTheme = theme;
  try {
    window.localStorage.setItem(storageKey, theme);
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
    // The switch still works for this session when browser storage is blocked.
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function subscribeAdminTheme(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) {
      fallbackTheme = "light";
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, onChange);
  };
}
