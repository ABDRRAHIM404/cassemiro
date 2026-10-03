export type LimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "invalid" | "too-large" };

export async function readLimitedJson(request: Request, maxBytes: number): Promise<LimitedJsonResult> {
  const length = request.headers.get("content-length");
  if (length && /^\d+$/u.test(length) && Number(length) > maxBytes) {
    return { ok: false, reason: "too-large" };
  }
  if (!request.body) return { ok: false, reason: "invalid" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        void reader.cancel().catch(() => {});
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }

    const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, received));
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
