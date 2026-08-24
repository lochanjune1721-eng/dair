import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Entry } from "@/lib/types";
import { verifyUploadToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Records the uploaded path and marks the entry submitted. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const verified = verifyUploadToken(String(body.token ?? ""));
  if (!verified.ok) {
    return NextResponse.json({ error: "This link is not valid." }, { status: 403 });
  }

  const kind = body.kind === "logo" ? "logo" : "video";
  const path = String(body.path ?? "");
  if (!path) return NextResponse.json({ error: "Missing file." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: entry } = await db
    .from("entries")
    .select("id,status,slot_number,video_path")
    .eq("id", verified.entryId)
    .maybeSingle();

  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  if (!["paid", "submitted", "approved"].includes(entry.status) || entry.slot_number === null) {
    return NextResponse.json({ error: "This entry is not paid." }, { status: 403 });
  }

  // Storage paths come back prefixed with the bucket on some client versions.
  const cleaned = path.replace(/^(videos|logos)\//, "");

  const update: Partial<Entry> =
    kind === "logo"
      ? { logo_path: cleaned }
      : {
          video_path: cleaned,
          video_duration: Number.isFinite(Number(body.duration))
            ? Math.round(Number(body.duration))
            : null,
          // Approved entries stay approved; a re-upload does not un-approve.
          status: entry.status === "approved" ? "approved" : "submitted",
          submitted_at: new Date().toISOString(),
        };

  const { error } = await db.from("entries").update(update).eq("id", entry.id);
  if (error) {
    console.error("[upload/complete] update failed", error);
    return NextResponse.json({ error: "Could not save the upload." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
