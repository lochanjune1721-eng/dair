import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveSeason } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Slot confirmed", robots: { index: false } };

export default async function ConfirmedPage() {
  const season = await getActiveSeason();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader seasonName={season?.name} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-16 sm:px-6">
        <p className="marginalia opacity-60">PAYMENT RECEIVED</p>
        <h1 className="mt-4 max-w-[16ch] font-display text-48 sm:text-96">YOUR SLOT IS HELD</h1>
        <p className="mt-6 max-w-[56ch] text-16">
          An upload link is on its way to the address you paid with. It is yours alone and it
          expires in fourteen days. Your entry appears in the feed once it is approved.
        </p>
        <p className="mt-4 max-w-[56ch] text-14 opacity-70">
          Slot numbers are assigned in payment order and confirmed by Stripe, so the link can take
          a moment to arrive. If it does not, reply to your Stripe receipt.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/dare" className="btn">
            Read the rules
          </Link>
          <Link href="/" className="btn btn-solid">
            Watch the feed
          </Link>
        </div>
      </main>
      <SiteFooter seasonName={season?.name} />
    </div>
  );
}
