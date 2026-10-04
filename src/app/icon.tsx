import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
const artworkData = readFile(join(process.cwd(), "public/images/brand/client-logo-construcoes-dark-v1.png"));

export default async function Icon() {
  const artwork = await artworkData;
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#11120f", alignItems: "center", justifyContent: "center" }}>
      {/* ImageResponse renders the exact approved artwork, not a redrawn mark. */}
      <img src={`data:image/png;base64,${artwork.toString("base64")}`} alt="CASSEMIRO" width={64} height={39} />
    </div>,
    size,
  );
}
