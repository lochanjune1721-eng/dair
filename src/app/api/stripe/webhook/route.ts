import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { env } from "@/lib/env";
import { sendUploadLink } from "@/lib/mail";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createUploadToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Unsigned." }, { status: 400 });

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  } catch (error) {
    console.error("[webhook] signature verification failed", error);
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const entryId = session.metadata?.entry_id ?? session.client_reference_id;

    if (!entryId) {
      console.error("[webhook] session without entry_id", session.id);
      return NextResponse.json({ received: true });
    }

    const db = supabaseAdmin();
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    // Slot assignment happens inside a single locking transaction in Postgres,
    // so two simultaneous payments cannot both claim slot 25.
    const { data, error } = await db.rpc("claim_slot", {
      p_entry_id: entryId,
      p_session_id: session.id,
      p_payment_intent: paymentIntent,
    });

    if (error) {
      console.error("[webhook] claim_slot failed", entryId, error);
      // The season filled while this payment was in flight. Flag it loudly and
      // acknowledge — retrying will not free a slot; this needs a refund.
      if (/is full/.test(error.message)) {
        await db
          .from("entries")
          .update({ status: "rejected", reserved_until: null })
          .eq("id", entryId);
        return NextResponse.json({ received: true, oversold: true });
      }
      return NextResponse.json({ error: "Could not assign slot." }, { status: 500 });
    }

    const entry = data as unknown as {
      id: string;
      company_name: string;
      contact_email: string;
      slot_number: number | null;
    };

    const token = createUploadToken(entry.id);
    const url = `${env.siteUrl}/upload/${token}`;

    try {
      await sendUploadLink(entry.contact_email, entry.company_name, url);
    } catch (mailError) {
      // Never fail the webhook on mail delivery — the admin table exposes the
      // same link, and Stripe would otherwise retry a completed claim.
      console.error("[webhook] upload link email failed", mailError);
    }
  }

  return NextResponse.json({ received: true });
}
