"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";

import { RankNumber } from "@/components/RankNumber";
import { useLiveEntries } from "@/hooks/useLiveEntries";
import { number, pad, stamp } from "@/lib/format";
import { compareByRank } from "@/lib/rank";
import { videoUrl } from "@/lib/supabase/public";
import type { PublicEntry } from "@/lib/types";

/** A fixture list. Ruled rows, mono columns that align exactly. */
export function LeaderboardTable({ initialEntries }: { initialEntries: PublicEntry[] }) {
  const router = useRouter();
  const { entries } = useLiveEntries(initialEntries);
  const ranked = useMemo(() => [...entries].sort(compareByRank), [entries]);
  const totalVotes = useMemo(
    () => ranked.reduce((sum, entry) => sum + entry.vote_count, 0),
    [ranked]
  );

  if (ranked.length === 0) {
    return (
      <div className="rule-t rule-b py-16">
        <p className="text-24">No entries approved yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rule-b flex items-baseline justify-between pb-3">
        <span className="marginalia flex items-center gap-2 opacity-70">
          <span className="live-tick inline-block h-2 w-2 bg-live" />
          LIVE — UPDATES AS VOTES LAND
        </span>
        <span className="marginalia opacity-70">
          TOTAL VOTES <span className="tabular">{number(totalVotes)}</span>
        </span>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="rule-b marginalia text-left opacity-60">
            <th className="w-[64px] py-3 font-normal">Rank</th>
            <th className="w-[56px] py-3 font-normal" aria-label="Preview" />
            <th className="py-3 font-normal">Company</th>
            <th className="hidden py-3 font-normal sm:table-cell">Submitted</th>
            <th className="py-3 text-right font-normal">Votes</th>
            <th className="py-3 text-right font-normal">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((entry, index) => (
            <Row key={entry.id} entry={entry} rank={index + 1} onOpen={() => router.push(`/?e=${entry.slug}`)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  entry,
  rank,
  onOpen,
}: {
  entry: PublicEntry;
  rank: number;
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const src = videoUrl(entry.video_path);

  return (
    <tr
      tabIndex={0}
      role="link"
      aria-label={`Rank ${rank}: ${entry.company_name}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={() => void videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => videoRef.current?.pause()}
      className="rule-b cursor-pointer hover:bg-ink hover:text-paper"
    >
      <td className="py-3 align-middle">
        <RankNumber value={rank} size={24} className="tabular" />
      </td>
      <td className="py-2 align-middle">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            className="h-[64px] w-[36px] bg-field object-contain"
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="h-[64px] w-[36px] bg-field" />
        )}
      </td>
      <td className="py-3 align-middle">
        <div className="font-medium">{entry.company_name}</div>
        <div className="max-w-[44ch] truncate text-12 opacity-60">
          {entry.product_tagline ?? ""}
        </div>
      </td>
      <td className="tabular hidden py-3 align-middle text-14 sm:table-cell">
        {stamp(entry.submitted_at)}
      </td>
      <td className="tabular py-3 text-right align-middle">{number(entry.vote_count)}</td>
      <td className="tabular py-3 text-right align-middle opacity-70">
        {number(entry.click_count)}
      </td>
    </tr>
  );
}
