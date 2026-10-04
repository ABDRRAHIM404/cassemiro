/** In-memory identity retained for the lifetime of one selected-file upload. */
export type MediaUploadAttempt = {
  id: string;
  path: string;
  started: boolean;
  storageUploaded: boolean;
};

export type MediaUploadOperations = {
  recordExists: () => Promise<boolean>;
  uploadObject: () => Promise<void>;
  objectExists: () => Promise<boolean>;
  insertRecord: () => Promise<void>;
};

/** Never delete an object because a database response was lost or ambiguous. */
export async function persistMediaUpload(attempt: MediaUploadAttempt, operations: MediaUploadOperations): Promise<void> {
  if (attempt.started && await operations.recordExists()) return;
  attempt.started = true;
  if (!attempt.storageUploaded) {
    try {
      await operations.uploadObject();
      attempt.storageUploaded = true;
    } catch (error) {
      // Storage can also commit before the browser receives its response.
      if (!await operations.objectExists()) throw error;
      attempt.storageUploaded = true;
    }
  }
  try {
    await operations.insertRecord();
  } catch (error) {
    // A successful reconciliation means the same exact row was already saved.
    // If this read fails, preserve the object and identity for an explicit retry.
    if (!await operations.recordExists()) throw error;
  }
}
