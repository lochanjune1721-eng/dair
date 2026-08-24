import { NextResponse, type NextRequest } from "next/server";

import {
  FINGERPRINT_COOKIE,
  FINGERPRINT_MAX_AGE,
  clientIp,
  hashIp,
  newFingerprint,
  readFingerprint,
} from "@/lib/identity";
import { checkVoteRateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — the entry ids this visitor has already voted for. Server-side only:
 *  the votes table has no public SELECT policy. */
export async function GET(request: NextRequest) {
  const fingerprint = readFingerprint(request);
  if (!fingerprint) return NextResponse.json({ voted: [] });

  const { data } = await supabaseAdmin()
    .from("votes")
    .select("entry_id")
    .eq("voter_fingerprint", fingerprint);

  return NextResponse.json(
    { voted: (data ?? []).map((row) => row.entry_id) },
    { headers: { "cache-control": "no-store" } }
  );
}

/** POST — cast one vote. One per visitor per entry, forever. No unvoting. */
export async function POST(request: NextRequest) {
  let body: { entryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const entryId = body.entryId;
  if (!entryId || typeof entryId !== "string") {
    return NextResponse.json({ error: "Missing entry." }, { status: 400 });
  }

  let fingerprint = readFingerprint(request);
  const issuedFingerprint = !fingerprint;
  if (!fingerprint) fingerprint = newFingerprint();

  const ipHash = hashIp(clientIp(request));
  const db = supabaseAdmin();

  const limit = await checkVoteRateLimit(fingerprint, ipHash);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many votes. Try again later." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
    );
  }

  // Only approved entries are votable.
  const { data: entry } = await db
    .from("entries")
    .select("id,vote_count,status")
    .eq("id", entryId)
    .maybeSingle();

  if (!entry || entry.status !== "approved") {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const { error } = await db
    .from("votes")
    .insert({ entry_id: entryId, voter_fingerprint: fingerprint, ip_hash: ipHash });

  // 23505 — the (entry_id, voter_fingerprint) unique index. Already voted.
  const duplicate = error?.code === "23505";
  if (error && !duplicate) {
    console.error("[vote] insert failed", error);
    return NextResponse.json({ error: "Vote could not be recorded." }, { status: 500 });
  }

  // Re-read the trigger-maintained counter rather than incrementing locally.
  const { data: fresh } = await db
    .from("entries")
    .select("vote_count")
    .eq("id", entryId)
    .maybeSingle();

  const response = NextResponse.json(
    {
      ok: true,
      duplicate,
      voteCount: fresh?.vote_count ?? entry.vote_count + (duplicate ? 0 : 1),
    },
    { headers: { "cache-control": "no-store" } }
  );

  if (issuedFingerprint) {
    response.cookies.set(FINGERPRINT_COOKIE, fingerprint, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: FINGERPRINT_MAX_AGE,
    });
  }

  return response;
}
