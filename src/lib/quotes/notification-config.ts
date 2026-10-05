// Business requirement: never accept a recipient from the request or an old env value.
export const QUOTE_NOTIFICATION_EMAIL = "Cassemiro.obras@gmail.com";

export function quoteNotificationsConfigured() {
  return Boolean(process.env.GMAIL_APP_PASSWORD?.trim() || (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL));
}
