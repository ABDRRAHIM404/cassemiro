import { createElement as h } from "react";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// A build-time brand graphic, not invented portfolio photography. Keep project
// covers explicit in metadata rather than overriding them with a root OG file.
export const dynamic = "force-static";
const artworkData = readFile(join(process.cwd(), "public/images/brand/client-logo-construcoes-dark-v1.png"));

export async function GET() {
  const artwork = await artworkData;
  return new ImageResponse(
    h("div", { style: { display: "flex", width: "100%", height: "100%", background: "#0e0e0e", color: "#eeeae2", padding: 80, flexDirection: "column", justifyContent: "space-between", borderLeft: "12px solid #b08b5a" } },
      h("div", { style: { display: "flex", alignItems: "center", gap: 28 } },
        h("img", { src: `data:image/png;base64,${artwork.toString("base64")}`, alt: "CASSEMIRO Construções & Reformas", width: 220, height: 134 })),
      h("div", { style: { display: "flex", flexDirection: "column", gap: 18 } },
        h("div", { style: { fontSize: 58, maxWidth: 900, lineHeight: 1.15 } }, "Do alicerce ao acabamento."),
        h("div", { style: { fontSize: 24, color: "#b08b5a" } }, "Sorocaba e região")),
      h("div", { style: { display: "flex", fontSize: 22, borderTop: "1px solid #59472f", paddingTop: 24 } }, "Experiência prática. Execução responsável.")),
    { width: 1200, height: 630 }
  );
}
