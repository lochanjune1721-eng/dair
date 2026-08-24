import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clears reservations past reserved_until, releasing the slot.
 * Wired to Vercel cron every 5 minutes (see vercel.json).
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
