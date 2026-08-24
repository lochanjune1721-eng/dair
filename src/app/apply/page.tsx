import type { Metadata } from "next";
import Link from "next/link";

import { ApplyForm } from "@/components/apply/ApplyForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveSeason, getSlotsTaken } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apply",
  description: "Twenty-five slots. One thousand dollars each. One dare.",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: { cancelled?: string };
}) {
  const season = await getActiveSeason();
  const taken = season ? await getSlotsTaken(season.id) : 25;
  const remaining = season ? Math.max(0, season.total_slots - taken) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader seasonName={season?.name} current="/apply" />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="marginalia opacity-60">
              {(season?.name ?? "Season one").toUpperCase()} / ENTRY FORM
            </p>
            <h1 className="mt-4 font-display text-48 sm:text-96">TAKE A SLOT</h1>
            <p className="mt-4 max-w-[56ch] text-16">
              Twenty-five companies. One dare. One vertical video each. The leaderboard ranks by
              votes cast on this site and nothing else.
            </p>

            {searchParams.cancelled ? (
              <p role="status" className="marginalia mt-6 text-live">
                Checkout was cancelled. Your slot was not taken.
              </p>
            ) : null}

            <div className="mt-10">
              <ApplyForm remaining={remaining} />
            </div>
          </div>

          <aside className="rule-t pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="marginalia opacity-60">THE TERMS</p>
            <dl className="mt-4 text-14">
              {[
                ["Price", "$1,000 one time"],
                ["Slots", "25 per season"],
                ["Format", "One vertical video, 9:16"],
                ["Limit", "Under 50 MB"],
                ["Hold", "30 minutes at checkout"],
              ].map(([term, value]) => (
                <div key={term} className="rule-b flex justify-between gap-4 py-3">
                  <dt className="opacity-60">{term}</dt>
                  <dd className="tabular text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-14 opacity-70">
              Read{" "}
              <Link href="/dare" className="underline underline-offset-4">
                the dare and the rules
              </Link>{" "}
              before you pay. Disqualification conditions are listed there in full.
            </p>
          </aside>
        </div>
      </main>

      <SiteFooter seasonName={season?.name} />
    </div>
  );
}
