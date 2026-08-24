import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

let cached: SupabaseClient<Database> | null = null;

/**
 * Anon client. Reads approved entries and seasons, and nothing else — RLS
 * enforces that. Safe in the browser; also used for realtime subscriptions.
 */
export function supabasePublic(): SupabaseClient<Database> {
  if (!cached) {
    cached = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return cached;
}

export function storageUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export const videoUrl = (path: string | null) => storageUrl("videos", path);
export const logoUrl = (path: string | null) => storageUrl("logos", path);
