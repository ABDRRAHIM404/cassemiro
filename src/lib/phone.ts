export function normalizeWhatsAppPhone(value: string): string | null {
  const digits = value.replace(/\D/gu, "");

  if (/^\+/.test(value.trim())) {
    return /^\d{10,15}$/u.test(digits) ? digits : null;
  }

  if (/^55[1-9]\d{9,10}$/u.test(digits)) return digits;
  if (/^[1-9]\d{9,10}$/u.test(digits)) return `55${digits}`;

  return null;
}

export function whatsappUrlForPhone(phone: string, message: string): string | null {
  const number = normalizeWhatsAppPhone(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
