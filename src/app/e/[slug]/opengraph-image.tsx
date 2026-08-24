import { ImageResponse } from "next/og";

import { getActiveSeason, getApprovedEntries, getEntryBySlug } from "@/lib/queries";
import { rankOf } from "@/lib/rank";

export const runtime = "nodejs";
export const alt = "Entry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#EDEAE3";
const INK = "#12100E";
const RULE = "#C4BFB4";

/** Shares carry the rank. That is the whole point of the image. */
export default async function Image({ params }: { params: { slug: string } }) {
  const entry = await getEntryBySlug(params.slug);
  const season = await getActiveSeason();
  const siblings = season ? await getApprovedEntries(season.id, "top") : [];
  const rank = entry ? rankOf(siblings, entry.id) || 1 : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 4,
            borderBottom: `2px solid ${RULE}`,
            paddingBottom: 20,
          }}
        >
          <span>DAIR</span>
          <span>{(season?.name ?? "SEASON ONE").toUpperCase()}</span>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48 }}>
          <div style={{ display: "flex", fontSize: 300, fontWeight: 800, lineHeight: 0.85 }}>
            {String(Math.max(rank, 0)).padStart(2, "0")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 26, letterSpacing: 4 }}>RANK</div>
            <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1 }}>
              {entry?.company_name ?? "Entry not found"}
            </div>
            <div style={{ fontSize: 30, opacity: 0.7, maxWidth: 560 }}>
              {entry?.product_tagline ?? ""}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: 3,
            borderTop: `2px solid ${RULE}`,
            paddingTop: 20,
          }}
        >
          <span>{`VOTES ${entry?.vote_count ?? 0}`}</span>
          <span>{`SLOT ${String(entry?.slot_number ?? 0).padStart(2, "0")} / 25`}</span>
        </div>
      </div>
    ),
    size
  );
}
