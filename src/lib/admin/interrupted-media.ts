// New uploads encode their immutable media-row identity in the object name.
// A reopened tab can reconcile the exact same ID, never invent a second row.
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const recoverableName = new RegExp(`^upload-(${uuid})\\.(jpg|png|webp|avif|mp4|webm)$`, "i");
export const INTERRUPTED_UPLOAD_GRACE_MS = 10 * 60 * 1000;

export function interruptedMediaIdentity(projectId: string, path: string): string | null {
  if (!new RegExp(`^${uuid}$`, "i").test(projectId)) return null;
  if (!path.startsWith(`${projectId}/`)) return null;
  return recoverableName.exec(path.slice(projectId.length + 1))?.[1] ?? null;
}

export function isInterruptedUploadOldEnough(updatedAt: string | null | undefined, now = Date.now()): boolean {
  const updated = Date.parse(updatedAt ?? "");
  return Number.isFinite(updated) && updated <= now - INTERRUPTED_UPLOAD_GRACE_MS;
}
