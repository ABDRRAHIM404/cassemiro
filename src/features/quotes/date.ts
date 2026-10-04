export function parseBrazilianDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return `${match[3]}-${match[2]}-${match[1]}`;
}
/** Format progressively without assuming a locale or constructing a UTC date. */
export function maskBrazilianDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

export function calendarDateToBrazilian(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-");
  const formatted = `${day}/${month}/${year}`;
  return parseBrazilianDate(formatted) ? formatted : "";
}
