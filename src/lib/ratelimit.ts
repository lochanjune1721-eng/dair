import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export const VOTES_PER_HOUR_PER_FINGERPRINT = 25;
export const VOTES_PER_HOUR_PER_IP = 100;

export interface RateLimitResult {
  allowed: boolean;
  scope?: "fingerprint" | "ip";
  retryAfterSeconds: number;
}

/**
 * Counts votes cast in the trailing hour. Backed by Postgres rather than
 * process memory so the limit holds across serverless instances.
 */
export async function checkVoteRateLimit(
  fingerprint: string,
  ipHash: string
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const db = supabaseAdmin();

  const [byFingerprint, byIp] = await Promise.all([
    db
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("voter_fingerprint", fingerprint)
      .gte("created_at", since),
    db
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since),
  ]);

  if ((byFingerprint.count ?? 0) >= VOTES_PER_HOUR_PER_FINGERPRINT) {
    return { allowed: false, scope: "fingerprint", retryAfterSeconds: 3600 };
  }
  if ((byIp.count ?? 0) >= VOTES_PER_HOUR_PER_IP) {
    return { allowed: false, scope: "ip", retryAfterSeconds: 3600 };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
