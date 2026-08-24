import type { PublicEntry } from "@/lib/types";

/** Votes desc, then earliest submitted_at. Ties stay stable. */
export function compareByRank(a: PublicEntry, b: PublicEntry): number {
  if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
  const at = a.submitted_at ? Date.parse(a.submitted_at) : Number.MAX_SAFE_INTEGER;
  const bt = b.submitted_at ? Date.parse(b.submitted_at) : Number.MAX_SAFE_INTEGER;
  if (at !== bt) return at - bt;
  return (a.slot_number ?? 999) - (b.slot_number ?? 999);
}

export function rankOf(entries: PublicEntry[], id: string): number {
  return [...entries].sort(compareByRank).findIndex((entry) => entry.id === id) + 1;
}
