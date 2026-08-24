import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deletes reservation rows past reserved_until.
 *
 * This is housekeeping, not a correctness requirement. An expired reservation
 * stops counting against the 25 the moment it lapses, because slots_taken only
 * counts reservations where reserved_until > now(), and claim_slot only counts
 * rows that actually hold a slot number. Nothing is scheduled to call this —
 * hit it by hand when the entries table needs tidying, or leave the rows.
 */
async function run(request: NextRequest) {
  const secret = env.cronSecret;
  if (secret) {
    const header = request.headers.get("authorization");
    const provided = header?.replace(/^Bearer\s+/i, "");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const { data, error } = await supabaseAdmin().rpc("release_expired_reservations");
  if (error) {
    console.error("[cron] release failed", error);
    return NextResponse.json({ error: "Release failed." }, { status: 500 });
  }

  return NextResponse.json({ released: data ?? 0 });
}

export const GET = run;
export const POST = run;
