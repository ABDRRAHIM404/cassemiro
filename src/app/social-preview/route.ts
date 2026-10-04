import { createElement as h } from "react";
import { ImageResponse } from "next/og";

// A build-time brand graphic, not invented portfolio photography. Keep project
// covers explicit in metadata rather than overriding them with a root OG file.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    h("div", { style: { display: "flex", width: "100%", height: "100%", background: "#0e0e0e", color: "#eeeae2", padding: 80, flexDirection: "column", justifyContent: "space-between", borderLeft: "12px solid #b08b5a" } },
      h("div", { style: { display: "flex", alignItems: "center", gap: 28 } },
        h("svg", { width: 86, height: 100, viewBox: "0 0 48 56" },
          h("path", { d: "M42 9 24 1 6 11v34l18 10 18-9V34L26 43V31l8-4-8-4v-9l16 7V9Z", fill: "#eeeae2" }),
          h("path", { d: "m6 11 18 10 18-12L24 1 6 11Z", fill: "#b08b5a", opacity: 0.9 })),
        h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
          h("div", { style: { fontSize: 52, letterSpacing: 9 } }, "CASSEMIRO"),
          h("div", { style: { fontSize: 18, letterSpacing: 4, color: "#b08b5a" } }, "CONSTRUÇÃO & REFORMAS"))),
      h("div", { style: { display: "flex", flexDirection: "column", gap: 18 } },
        h("div", { style: { fontSize: 58, maxWidth: 900, lineHeight: 1.15 } }, "Do alicerce ao acabamento."),
        h("div", { style: { fontSize: 24, color: "#b08b5a" } }, "Sorocaba e região")),
      h("div", { style: { display: "flex", fontSize: 22, borderTop: "1px solid #59472f", paddingTop: 24 } }, "Experiência prática. Execução responsável.")),
    { width: 1200, height: 630 }
  );
}
