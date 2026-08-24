"use client";

import { useEffect, useState } from "react";

import { supabasePublic } from "@/lib/supabase/public";
import type { PublicEntry } from "@/lib/types";

/**
 * Keeps counters current via Supabase realtime on `entries`. RLS means only
 * approved rows ever arrive. Local optimistic values are merged by taking the
 * larger count, so a vote never appears to go backwards mid-reconcile.
 */
export function useLiveEntries(initial: PublicEntry[]) {
  const [entries, setEntries] = useState(initial);

  useEffect(() => {
    setEntries((current) =>
      initial.map((entry) => {
        const existing = current.find((candidate) => candidate.id === entry.id);
        return existing ? { ...entry, vote_count: Math.max(entry.vote_count, existing.vote_count) } : entry;
      })
    );
  }, [initial]);

  useEffect(() => {
    const channel = supabasePublic()
      .channel("entries-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "entries" },
        (payload) => {
          const row = payload.new as PublicEntry & { status?: string };
          setEntries((current) => {
            const index = current.findIndex((entry) => entry.id === row.id);
            if (index === -1) return current;
            const next = [...current];
            next[index] = {
              ...next[index]!,
              vote_count: Math.max(next[index]!.vote_count, row.vote_count ?? 0),
              click_count: Math.max(next[index]!.click_count, row.click_count ?? 0),
              view_count: Math.max(next[index]!.view_count, row.view_count ?? 0),
            };
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      void supabasePublic().removeChannel(channel);
    };
  }, []);

  const applyLocal = (id: string, patch: Partial<PublicEntry>) =>
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );

  return { entries, applyLocal };
}
