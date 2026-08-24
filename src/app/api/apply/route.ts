import { NextResponse, type NextRequest } from "next/server";

import { RESERVATION_MINUTES, SLOT_PRICE_CENTS, env } from "@/lib/env";
import { isEmail, normalizeUrl } from "@/lib/format";
import { getActiveSeason, getSlotsTaken } from "@/lib/queries";
import { slugify } from "@/lib/slug";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reserves a slot for 30 minutes and hands back a Stripe Checkout URL.
 * The slot is not actually claimed until the webhook fires — the reservation
 * only keeps the counter honest while the visitor is in Checkout.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const companyName = String(body.companyName ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase();
  const tagline = String(body.productTagline ?? "").trim();
  const companyUrl = normalizeUrl(String(body.companyUrl ?? ""));

  if (companyName.length < 2 || companyName.length > 80) {
    return NextResponse.json({ error: "Enter a company name." }, { status: 400 });
  }
  if (!companyUrl) {
    return NextResponse.json({ error: "Enter a valid company URL." }, { status: 400 });
  }
  if (!isEmail(contactEmail)) {
    return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
  }
  if (tagline.length < 2 || tagline.length > 100) {
    return NextResponse.json(
      { error: "Tagline must be between 2 and 100 characters." },
      { status: 400 }
    );
  }

  const season = await getActiveSeason();
  if (!season) {
    return NextResponse.json({ error: "No season is open." }, { status: 409 });
  }

  const taken = await getSlotsTaken(season.id);
  if (taken >= season.total_slots) {
    return NextResponse.json(
      { error: "All 25 slots taken. Season two opens later." },
      { status: 409 }
    );
  }

  const db = supabaseAdmin();
  const base = slugify(companyName);
  const reservedUntil = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000).toISOString();

  let entryId: string | null = null;
  for (let attempt = 0; attempt < 6 && !entryId; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await db
      .from("entries")
      .insert({
        season_id: season.id,
        slug,
        company_name: companyName,
        company_url: companyUrl,
        product_tagline: tagline,
        contact_email: contactEmail,
        status: "reserved",
        reserved_until: reservedUntil,
      })
      .select("id")
      .single();

    if (data) entryId = data.id;
    else if (error?.code !== "23505") {
      console.error("[apply] insert failed", error);
      return NextResponse.json({ error: "Could not reserve a slot." }, { status: 500 });
    }
  }

  if (!entryId) {
    return NextResponse.json({ error: "Could not reserve a slot." }, { status: 500 });
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: contactEmail,
      client_reference_id: entryId,
      success_url: `${env.siteUrl}/apply/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/apply?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + RESERVATION_MINUTES * 60,
      metadata: { entry_id: entryId, season_id: season.id },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: SLOT_PRICE_CENTS,
            product_data: {
              name: `${season.name} — one slot`,
              description: "One entry in the tournament. One vertical video.",
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: { entry_id: entryId },
        transfer_data: { destination: env.stripeConnectAccountId },
      },
    });

    await db
      .from("entries")
      .update({ stripe_session_id: session.id })
      .eq("id", entryId);

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("[apply] checkout failed", error);
    // Release the reservation immediately rather than waiting for the cron.
    await db.from("entries").delete().eq("id", entryId).eq("status", "reserved");
    return NextResponse.json({ error: "Payment could not be started." }, { status: 502 });
  }
}
