// A saved quote must not become a failed HTTP request because its optional alert failed.
export async function optionalNotificationError(
  send: () => Promise<{ error?: unknown }>
): Promise<unknown | null> {
  try {
    return (await send()).error ?? null;
  } catch (error) {
    return error;
  }
}
