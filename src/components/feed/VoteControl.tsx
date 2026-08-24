"use client";

import { BallotMark } from "@/components/Glyphs";
import { number } from "@/lib/format";

/**
 * The vote icon fills instantly — no bounce, no scale spring.
 * There is no unvoting.
 */
export function VoteControl({
  voted,
  count,
  onVote,
  pending,
}: {
  voted: boolean;
  count: number;
  onVote: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onVote}
        disabled={voted || pending}
        aria-pressed={voted}
        aria-label={voted ? "Voted" : "Vote"}
        className="flex h-11 w-11 items-center justify-center border border-paper/40 text-paper disabled:cursor-default"
        style={voted ? { borderColor: "var(--live)" } : undefined}
      >
        <BallotMark filled={voted} />
      </button>
      <span className="tabular text-12 text-paper" aria-live="polite">
        {number(count)}
      </span>
      <span className="marginalia text-paper/60" style={voted ? { color: "var(--live)" } : undefined}>
        {voted ? "Voted" : "Vote"}
      </span>
    </div>
  );
}
