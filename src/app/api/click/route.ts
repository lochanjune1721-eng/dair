import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Logs an outbound click and returns the destination. */
export async function POST(request: NextRequest) {
  let body: { entryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!body.entryId) return NextResponse.json({ error: "Missing entry." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: entry } = await db
    .from("entries")
    .select("id,company_url,status")
    .eq("id", body.entryId)
    .maybeSingle();

  if (!entry || entry.status !== "approved") {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const { error } = await db.from("clicks").insert({
    entry_id: entry.id,
    referrer: request.headers.get("referer"),
  });
  if (error) console.error("[click] insert failed", error);

  return NextResponse.json(
    { ok: true, url: entry.company_url },
    { headers: { "cache-control": "no-store" } }
  );
}
