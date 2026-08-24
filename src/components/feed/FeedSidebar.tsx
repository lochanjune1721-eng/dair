"use client";

import { number, pad } from "@/lib/format";
import type { PublicEntry } from "@/lib/types";

/** Desktop: the ruled leaderboard as a right sidebar. A fixture list. */
export function FeedSidebar({
  entries,
  activeId,
  onSelect,
  totalVotes,
}: {
  entries: PublicEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
  totalVotes: number;
}) {
  return (
    <aside className="pointer-events-auto hidden h-[100dvh] w-[320px] shrink-0 flex-col border-l border-paper/20 bg-field text-paper xl:flex">
      <div className="border-b border-paper/20 px-4 py-4">
        <div className="marginalia flex items-center justify-between text-paper/60">
          <span>STANDINGS</span>
          <span className="flex items-center gap-2">
            <span className="live-tick inline-block h-2 w-2" style={{ background: "var(--live)" }} />
            LIVE
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="marginalia text-paper/60">TOTAL VOTES</span>
          <span className="tabular text-24">{number(totalVotes)}</span>
        </div>
      </div>

      <div className="grid grid-cols-[28px_1fr_56px_52px] gap-2 border-b border-paper/20 px-3 py-2">
        {["#", "COMPANY", "VOTES", "CLICKS"].map((label, index) => (
          <span
            key={label}
            className={`marginalia truncate text-paper/50 ${index > 1 ? "text-right" : ""}`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-14 text-paper/60">No entries approved yet.</p>
        ) : (
          entries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry.id)}
              aria-current={entry.id === activeId ? "true" : undefined}
              className={`grid w-full grid-cols-[28px_1fr_56px_52px] items-baseline gap-2 border-b border-paper/10 px-3 py-2 text-left hover:bg-paper hover:text-ink ${
                entry.id === activeId ? "bg-paper/10" : ""
              }`}
            >
              <span className="tabular text-14">{pad(index + 1)}</span>
              <span className="truncate text-14">{entry.company_name}</span>
              <span className="tabular text-right text-14">{number(entry.vote_count)}</span>
              <span className="tabular text-right text-14 opacity-60">
                {number(entry.click_count)}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
