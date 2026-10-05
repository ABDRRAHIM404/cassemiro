import type { QuoteRequestInput } from "../../features/quotes/validation";
import { QUOTE_NOTIFICATION_EMAIL } from "./notification-config";
import { quoteNotificationMessage } from "./notification-message";

export async function sendQuoteNotification(quote: QuoteRequestInput, saved: { id: string; created_at: string }): Promise<{ error?: unknown }> {
  const message = quoteNotificationMessage(quote, saved);
  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/gu, "");
  if (gmailPassword) {
    const { default: nodemailer } = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: QUOTE_NOTIFICATION_EMAIL, pass: gmailPassword },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
      disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false
    });
    try {
      const result = await transport.sendMail({
        ...message, from: { name: "CASSEMIRO", address: QUOTE_NOTIFICATION_EMAIL },
        messageId: `<quote-${saved.id}@cassemiro-one.vercel.app>`
      });
      if (!result.accepted?.some(address => (typeof address === "string" ? address : address.address).toLowerCase() === QUOTE_NOTIFICATION_EMAIL.toLowerCase())) {
        return { error: new Error("Quote notification recipient was not accepted") };
      }
      return {};
    } finally { transport.close(); }
  }
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const { Resend } = await import("resend");
    return new Resend(process.env.RESEND_API_KEY).emails.send(
      { ...message, from: process.env.RESEND_FROM_EMAIL },
      { idempotencyKey: `quote-notification-${saved.id}` }
    );
  }
  return { error: new Error("Quote email transport is not configured") };
}
