import { uploadFileStateLabels, type UploadFileProgressItem } from "@/lib/admin/upload-progress";

export function UploadFileProgress({ items }: { items: UploadFileProgressItem[] }) {
  if (!items.length) return null;
  return <section aria-label="Estado de cada arquivo" style={{ marginBlock: "1rem" }}>
    <ul style={{ paddingLeft: "1.25rem" }}>
      {items.map((item, index) => <li key={index} style={{ marginBlock: ".5rem", overflowWrap: "anywhere" }}>
        <span>{index + 1}. {item.name}</span>{" — "}
        <strong>{uploadFileStateLabels[item.state]}</strong>
      </li>)}
    </ul>
  </section>;
}
