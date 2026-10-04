type QuoteFailureOperation = "quote_insert" | "quote_notification";

// Only established machine codes are useful here. Messages/details, stacks,
// causes and arbitrary provider fields may contain submitted contact data.
const databaseCodes = new Set(["23502", "23503", "23505", "23514", "42501", "22001"]);
const providerNames = new Set([
  "rate_limit_exceeded", "validation_error", "missing_api_key",
  "restricted_api_key", "suspended_api_key", "application_error",
  "service_unavailable", "daily_quota_exceeded", "monthly_quota_exceeded",
]);

export function quoteFailureDiagnostic(operation: QuoteFailureOperation, cause: unknown) {
  let code = "unknown";
  if (cause && typeof cause === "object") {
    const field = operation === "quote_insert" ? "code" : "name";
    const value = (cause as Record<string, unknown>)[field];
    const allowed = operation === "quote_insert" ? databaseCodes : providerNames;
    if (typeof value === "string" && allowed.has(value)) code = value;
  }
  return {
    error: new Error(operation === "quote_insert"
      ? "Quote storage failed"
      : "Quote notification failed after storage"),
    tags: { operation, code },
  };
}
