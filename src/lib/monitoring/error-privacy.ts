import type { ErrorEvent } from "@sentry/nextjs";

/** Error diagnostics do not need submitted forms, credentials or browsing history.
 * This is deliberately limited to error events, not performance spans.
 */
export function protectErrorPrivacy(event: ErrorEvent): ErrorEvent {
  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  // Next's request-error hook duplicates the concrete URL (including query
  // parameters) here, outside event.request. Retain only its route diagnostics.
  if (event.contexts?.nextjs) {
    delete event.contexts.nextjs.request_path;
  }
  return event;
}
