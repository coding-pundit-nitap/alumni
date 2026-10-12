import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Hex, not oklch: Satori can't parse oklch. Values approximate the light tokens.
const PAPER = "#f9fafc";
const INK = "#1d2b4f";
const MUTED = "#5b6478";
const EMBLEM = "#185919";

export default async function Image() {
  const emblem = await readFile(
    join(process.cwd(), "public/brand/nitap-emblem.svg")
  );
  const emblemSrc = `data:image/svg+xml;base64,${emblem.toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 72,
        padding: "0 88px",
        backgroundColor: PAPER,
        color: INK,
        borderTop: `14px solid ${EMBLEM}`,
      }}
    >
      {/* oxlint-disable-next-line nextjs/no-img-element -- Satori renders plain img */}
      <img src={emblemSrc} width={300} height={316} alt="" />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 28, color: MUTED }}>
          Official alumni network
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -1.5,
          }}
        >
          NIT Arunachal Pradesh Alumni Network
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            paddingTop: 24,
            borderTop: `1px solid ${INK}22`,
            fontSize: 26,
            color: MUTED,
          }}
        >
          Verified alumni, mentorship, jobs and events
        </div>
      </div>
    </div>,
    { ...size }
  );
}
