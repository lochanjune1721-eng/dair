"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabasePublic } from "@/lib/supabase/public";
import type { PublicEntry } from "@/lib/types";

type Counts = Pick<PublicEntry, "vote_count" | "click_count" | "view_count">;

/**
 * Keeps counters current via Supabase realtime on `entries`. RLS means only
 * approved rows ever arrive.
 *
 * The server list stays the base and is never copied into state; live and
 * optimistic counts live in an overrides map and are merged during render, so
 * a refreshed server list and an in-flight vote cannot fight each other.
 */
export function useLiveEntries(initial: PublicEntry[]) {
  const [overrides, setOverrides] = useState<Record<string, Partial<Counts>>>({});

  const entries = useMemo(
    () => initial.map((entry) => ({ ...entry, ...overrides[entry.id] })),
    [initial, overrides]
  );

  useEffect(() => {
    const client = supabasePublic();
    const channel = client
      .channel("entries-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "entries" },
        (payload) => {
          const row = payload.new as Partial<PublicEntry> & { id?: string };
          if (!row.id) return;

          setOverrides((current) => {
            const existing = current[row.id!];
            // Never let a count go backwards past an optimistic vote that has
            // not been reconciled yet.
            const merge = (key: keyof Counts) => {
              const incoming = row[key] ?? 0;
              const held = existing?.[key];
              return held === undefined ? incoming : Math.max(held, incoming);
            };

            return {
              ...current,
              [row.id!]: {
                vote_count: merge("vote_count"),
                click_count: merge("click_count"),
                view_count: merge("view_count"),
              },
            };
          });
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  /** Absolute values, so a rejected vote can be rolled back down. */
  const applyLocal = useCallback((id: string, patch: Partial<Counts>) => {
    setOverrides((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }, []);

  return { entries, applyLocal };
}
