type StorageEntry = { name: string; id: string | null };
export type ProjectStorageCleanup = {
  list: (bucket: string, prefix: string, offset: number, limit: number) => Promise<StorageEntry[]>;
  remove: (bucket: string, paths: string[]) => Promise<void>;
};

const batchSize = 1000;

/** Inventory every bucket before removing anything. Never enumerate bucket roots.
 * This does not make Storage and Postgres deletion an atomic transaction.
 */
export async function listProjectStorage(
  projectId: string, buckets: string[], list: ProjectStorageCleanup["list"]
): Promise<{ bucket: string; paths: string[] }[]> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new Error("Identificador de projeto inválido.");
  }
  const inventories: { bucket: string; paths: string[] }[] = [];
  for (const bucket of buckets) {
    const paths: string[] = [];
    const folders = [projectId];
    for (let folder = 0; folder < folders.length; folder++) {
      const prefix = folders[folder];
      const seenNames = new Set<string>();
      for (let offset = 0; ; offset += batchSize) {
        const entries = await list(bucket, prefix, offset, batchSize);
        for (const entry of entries) {
          // Folder names are single segments, never paths supplied by a caller.
          if (!entry.name || entry.name === "." || entry.name === ".." ||
              /[\/\\\u0000]/.test(entry.name) || seenNames.has(entry.name)) {
            throw new Error("Não foi possível verificar os arquivos do projeto.");
          }
          seenNames.add(entry.name);
          const path = `${prefix}/${entry.name}`;
          if (entry.id === null) folders.push(path);
          else paths.push(path);
        }
        if (entries.length < batchSize) break;
      }
    }
    inventories.push({ bucket, paths });
  }
  return inventories;
}

export async function deleteProjectStorage(
  projectId: string, buckets: string[], io: ProjectStorageCleanup
): Promise<void> {
  const inventories = await listProjectStorage(projectId, buckets, io.list);
  // Offset pagination must finish before deletion, otherwise rows shift and skip.
  for (const { bucket, paths } of inventories) {
    for (let start = 0; start < paths.length; start += batchSize) {
      await io.remove(bucket, paths.slice(start, start + batchSize));
    }
  }
}
