import { protectErrorPrivacy } from "./src/lib/monitoring/error-privacy";

let captureRouterTransitionStart: ((url: string, navigationType: "push" | "replace" | "traverse") => void) | null = null;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      beforeSend: protectErrorPrivacy
    });
    captureRouterTransitionStart = Sentry.captureRouterTransitionStart;
  });
}

export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse") {
  captureRouterTransitionStart?.(url, navigationType);
}
