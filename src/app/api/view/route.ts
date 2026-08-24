import { NextResponse, type NextRequest } from "next/server";

import { readFingerprint } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One view per visitor per entry, logged after 2s of >=60% visibility. */
export async function POST(request: NextRequest) {
  let body: { entryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!body.entryId) return NextResponse.json({ error: "Missing entry." }, { status: 400 });

  const fingerprint = readFingerprint(request);
  const db = supabaseAdmin();

  if (fingerprint) {
    const { count } = await db
      .from("views")
      .select("id", { count: "exact", head: true })
      .eq("entry_id", body.entryId)
      .eq("voter_fingerprint", fingerprint);
    if ((count ?? 0) > 0) return NextResponse.json({ ok: true, deduped: true });
  }

  const { error } = await db
    .from("views")
    .insert({ entry_id: body.entryId, voter_fingerprint: fingerprint });
  if (error) console.error("[view] insert failed", error);

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
