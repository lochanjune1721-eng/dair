import type { Metadata } from "next";
import Link from "next/link";

import { Countdown } from "@/components/Countdown";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { stamp } from "@/lib/format";
import { getActiveSeason, getSlotsTaken } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The dare",
  description: "The dare in full, the rules, the deadline and the disqualification conditions.",
};

const DISQUALIFICATION = [
  "Vote manipulation of any kind, including scripted voting, paid voting, or coordinated voting from a single source.",
  "A video that is not the entrant's own company, product, or staff.",
  "Any edit that changes the outcome of the attempt without disclosure on screen.",
  "Footage recorded before the season opened.",
  "A video that is not vertical, is over 50 MB, or is submitted after the deadline.",
];

export default async function DarePage() {
  const season = await getActiveSeason();
  const taken = season ? await getSlotsTaken(season.id) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader seasonName={season?.name} current="/dare" />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6">
        <p className="marginalia opacity-60">
          {(season?.name ?? "Season one").toUpperCase()} / THE DARE
        </p>

        {/* Dare statement at 96px display. */}
        <h1 className="mt-6 max-w-[18ch] font-display text-48 leading-[0.92] sm:text-96">
          {season?.dare_text ?? "No dare has been set."}
        </h1>

        <div className="rule-t mt-10 grid gap-10 pt-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="marginalia opacity-60">RULES</h2>
            <div className="mt-4 max-w-[68ch] space-y-4 whitespace-pre-line text-16">
              {season?.dare_description ?? "Rules will be published when the season opens."}
            </div>

            <h2 className="marginalia mt-12 opacity-60">DISQUALIFICATION</h2>
            <ol className="mt-4 max-w-[68ch]">
              {DISQUALIFICATION.map((condition, index) => (
                <li key={condition} className="rule-b flex gap-4 py-3 text-16">
                  <span className="tabular shrink-0 opacity-50">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{condition}</span>
                </li>
              ))}
            </ol>

            <h2 className="marginalia mt-12 opacity-60">HOW RANK IS DECIDED</h2>
            <p className="mt-4 max-w-[68ch] text-16">
              Rank is driven only by votes cast on this site. Follower counts, view counts and
              engagement from anywhere else are not counted and never will be — ranking by those
              would sort companies by the audience they already had. One vote per visitor per
              entry. Ties break on earliest submission, so the order stays stable.
            </p>
          </div>

          <aside className="lg:border-l lg:pl-6">
            <dl className="text-14">
              {[
                ["Season", season?.name ?? "—"],
                ["Opened", stamp(season?.starts_at ?? null)],
                ["Closes", stamp(season?.ends_at ?? null)],
                ["Slots", `${String(taken).padStart(2, "0")} / ${season?.total_slots ?? 25}`],
                ["Entry fee", "$1,000"],
              ].map(([term, value]) => (
                <div key={term} className="rule-b flex justify-between gap-4 py-3">
                  <dt className="opacity-60">{term}</dt>
                  <dd className="tabular text-right">{value}</dd>
                </div>
              ))}
              <div className="rule-b py-3">
                <dt className="opacity-60">Time remaining</dt>
                <dd className="mt-1 text-16">
                  <Countdown target={season?.ends_at ?? null} />
                </dd>
              </div>
            </dl>

            <Link href="/apply" className="btn btn-solid mt-6 w-full">
              Take a slot — $1,000
            </Link>
          </aside>
        </div>
      </main>

      <SiteFooter seasonName={season?.name} />
    </div>
  );
}
