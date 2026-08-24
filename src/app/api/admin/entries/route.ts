import { NextResponse, type NextRequest } from "next/server";

import { isAdmin } from "@/lib/admin";
import { env } from "@/lib/env";
import { isEmail, normalizeUrl } from "@/lib/format";
import { getActiveSeason, getSlotsTaken } from "@/lib/queries";
import { slugify } from "@/lib/slug";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Entry } from "@/lib/types";
import { createUploadToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action = "approve" | "reject" | "update" | "grant" | "delete" | "upload_link";

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const action = String(body.action ?? "") as Action;
  const db = supabaseAdmin();

  if (action === "grant") {
    // Seeds an entry without payment. Claims a real slot so the counter and
    // the 25-slot ceiling stay accurate.
    const season = await getActiveSeason();
    if (!season) return NextResponse.json({ error: "No season is open." }, { status: 409 });

    const taken = await getSlotsTaken(season.id);
    if (taken >= season.total_slots) {
      return NextResponse.json({ error: "All 25 slots taken." }, { status: 409 });
    }

    const companyName = String(body.companyName ?? "").trim();
    const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase();
    const tagline = String(body.productTagline ?? "").trim();
    const companyUrl = normalizeUrl(String(body.companyUrl ?? ""));

    if (companyName.length < 2) {
      return NextResponse.json({ error: "Enter a company name." }, { status: 400 });
    }
    if (!isEmail(contactEmail)) {
      return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
    }
    if (tagline.length > 100) {
      return NextResponse.json({ error: "Tagline must be 100 characters or fewer." }, { status: 400 });
    }

    const base = slugify(companyName);
    let created: { id: string } | null = null;
    for (let attempt = 0; attempt < 6 && !created; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const { data, error } = await db
        .from("entries")
        .insert({
          season_id: season.id,
          slug,
          company_name: companyName,
          company_url: companyUrl,
          product_tagline: tagline || null,
          contact_email: contactEmail,
          status: "reserved",
        })
        .select("id")
        .single();
      if (data) created = data;
      else if (error?.code !== "23505") {
        console.error("[admin] grant insert failed", error);
        return NextResponse.json({ error: "Could not create the entry." }, { status: 500 });
      }
    }

    if (!created) return NextResponse.json({ error: "Could not create the entry." }, { status: 500 });

    const { data: claimed, error: claimError } = await db.rpc("claim_slot", {
      p_entry_id: created.id,
      p_session_id: null,
      p_payment_intent: null,
    });

    if (claimError) {
      await db.from("entries").delete().eq("id", created.id);
      console.error("[admin] grant claim failed", claimError);
      return NextResponse.json({ error: "Could not assign a slot." }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      entry: claimed,
      uploadUrl: `${env.siteUrl}/upload/${createUploadToken(created.id)}`,
    });
  }

  const entryId = String(body.entryId ?? "");
  if (!entryId) return NextResponse.json({ error: "Missing entry." }, { status: 400 });

  if (action === "approve" || action === "reject") {
    const { data: entry } = await db
      .from("entries")
      .select("id,video_path,status")
      .eq("id", entryId)
      .maybeSingle();

    if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (action === "approve" && !entry.video_path) {
      return NextResponse.json({ error: "No video uploaded yet." }, { status: 409 });
    }

    const { error } = await db
      .from("entries")
      .update({ status: action === "approve" ? "approved" : "rejected" })
      .eq("id", entryId);

    if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    const update: Partial<Entry> = {};

    if (body.productTagline !== undefined) {
      const tagline = String(body.productTagline).trim();
      if (tagline.length > 100) {
        return NextResponse.json({ error: "Tagline must be 100 characters or fewer." }, { status: 400 });
      }
      update.product_tagline = tagline || null;
    }
    if (body.companyUrl !== undefined) {
      const url = normalizeUrl(String(body.companyUrl));
      if (String(body.companyUrl).trim() && !url) {
        return NextResponse.json({ error: "Enter a valid URL." }, { status: 400 });
      }
      update.company_url = url;
    }
    if (body.companyName !== undefined) {
      const name = String(body.companyName).trim();
      if (name.length < 2) return NextResponse.json({ error: "Enter a company name." }, { status: 400 });
      update.company_name = name;
    }

    if (!Object.keys(update).length) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const { error } = await db.from("entries").update(update).eq("id", entryId);
    if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "upload_link") {
    return NextResponse.json({
      ok: true,
      uploadUrl: `${env.siteUrl}/upload/${createUploadToken(entryId)}`,
    });
  }

  if (action === "delete") {
    // Only unpaid reservations may be deleted. A paid entry holds a slot and a
    // payment record; rejecting it is the correct move, not deleting it.
    const { data: entry } = await db
      .from("entries")
      .select("id,slot_number,status")
      .eq("id", entryId)
      .maybeSingle();

    if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (entry.slot_number !== null) {
      return NextResponse.json(
        { error: "This entry holds a paid slot. Reject it instead." },
        { status: 409 }
      );
    }

    const { error } = await db.from("entries").delete().eq("id", entryId);
    if (error) return NextResponse.json({ error: "Delete failed." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
