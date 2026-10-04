export type UploadFileState = "pending" | "uploading" | "saved" | "unconfirmed";
export type UploadFileProgressItem = { name: string; state: UploadFileState };

export const uploadFileStateLabels: Record<UploadFileState, string> = {
  pending: "Aguardando envio",
  uploading: "Enviando…",
  saved: "Guardado na galeria",
  unconfirmed: "Envio não confirmado — tente novamente",
};

export function updateUploadFileState(items: UploadFileProgressItem[], index: number, state: UploadFileState) {
  return items.map((item, position) => position === index ? { ...item, state } : item);
}
