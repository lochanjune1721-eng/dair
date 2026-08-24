import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/lib/types";

let cached: SupabaseClient<Database> | null = null;

/**
 * Service-role client. Bypasses RLS — never import this from a client
 * component. The "server-only" import above turns any such import into a
 * build failure.
 */
export function supabaseAdmin(): SupabaseClient<Database> {
  if (!cached) {
    cached = createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
