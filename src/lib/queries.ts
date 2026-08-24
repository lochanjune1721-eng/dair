import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { PUBLIC_ENTRY_COLUMNS, type Entry, type PublicEntry, type Season } from "@/lib/types";

/** The single active season. Everything on the site hangs off this. */
export async function getActiveSeason(): Promise<Season | null> {
  const { data } = await supabaseAdmin()
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return (data as Season) ?? null;
}

export type FeedOrder = "top" | "new";

/**
 * Approved entries in rank order. Ties break on earliest submitted_at so the
 * ordering is stable between requests.
 */
export async function getApprovedEntries(
  seasonId: string,
  order: FeedOrder = "top"
): Promise<PublicEntry[]> {
  let query = supabaseAdmin()
    .from("entries")
    .select(PUBLIC_ENTRY_COLUMNS)
    .eq("season_id", seasonId)
    .eq("status", "approved");

  query =
    order === "new"
      ? query.order("submitted_at", { ascending: false, nullsFirst: false })
      : query
          .order("vote_count", { ascending: false })
          .order("submitted_at", { ascending: true, nullsFirst: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PublicEntry[];
}

export async function getEntryBySlug(slug: string): Promise<PublicEntry | null> {
  const { data } = await supabaseAdmin()
    .from("entries")
    .select(PUBLIC_ENTRY_COLUMNS)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  return (data as unknown as PublicEntry) ?? null;
}

/** Slots taken = paid-or-beyond, plus live reservations. */
export async function getSlotsTaken(seasonId: string): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc("slots_taken", { p_season_id: seasonId });
  if (error) throw error;
  return (data as unknown as number) ?? 0;
}

export async function getAllEntries(seasonId: string): Promise<Entry[]> {
  const { data, error } = await supabaseAdmin()
    .from("entries")
    .select("*")
    .eq("season_id", seasonId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Entry[];
}
