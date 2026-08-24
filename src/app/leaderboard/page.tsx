import type { Metadata } from "next";

import { LeaderboardTable } from "@/components/LeaderboardTable";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveSeason, getApprovedEntries } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "The record. Ranked by votes cast on this site and nothing else.",
};

export default async function LeaderboardPage() {
  const season = await getActiveSeason();
  const entries = season ? await getApprovedEntries(season.id, "top") : [];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader seasonName={season?.name} current="/leaderboard" />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6">
        <div className="rule-b flex flex-wrap items-end justify-between gap-4 pb-6">
          <div>
            <p className="marginalia opacity-60">
              {(season?.name ?? "Season one").toUpperCase()} / STANDINGS
            </p>
            <h1 className="mt-3 font-display text-48 sm:text-96">THE RECORD</h1>
          </div>
          <p className="marginalia max-w-[36ch] opacity-70">
            Ranked by votes cast on this site. Ties break on earliest submission. Row opens the
            entry in the feed.
          </p>
        </div>

        <div className="mt-8">
          <LeaderboardTable initialEntries={entries} />
        </div>
      </main>

      <SiteFooter seasonName={season?.name} />
    </div>
  );
}
