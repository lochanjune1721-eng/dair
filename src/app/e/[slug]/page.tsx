import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RankNumber } from "@/components/RankNumber";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SoloPlayer } from "@/components/SoloPlayer";
import { number, pad, stamp } from "@/lib/format";
import { getActiveSeason, getApprovedEntries, getEntryBySlug } from "@/lib/queries";
import { rankOf } from "@/lib/rank";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) return { title: "Entry not found" };

  return {
    title: entry.company_name,
    description: entry.product_tagline ?? "One dare. Twenty-five companies.",
    openGraph: {
      title: entry.company_name,
      description: entry.product_tagline ?? "One dare. Twenty-five companies.",
      url: `/e/${entry.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: entry.company_name,
      description: entry.product_tagline ?? "One dare. Twenty-five companies.",
    },
  };
}

export default async function EntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) notFound();

  const season = await getActiveSeason();
  const siblings = season ? await getApprovedEntries(season.id, "top") : [entry];
  const rank = rankOf(siblings, entry.id) || 1;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader seasonName={season?.name} />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6">
        <div className="rule-b flex flex-wrap items-end justify-between gap-6 pb-6">
          <div className="flex items-end gap-5">
            <RankNumber value={rank} size={96} ariaLabel={`Rank ${rank}`} />
            <div className="pb-2">
              <p className="marginalia opacity-60">RANK</p>
              <h1 className="mt-1 text-24 font-semibold">{entry.company_name}</h1>
            </div>
          </div>
          <dl className="marginalia flex gap-6 opacity-70">
            <div>
              <dt>VOTES</dt>
              <dd className="tabular mt-1 text-16">{number(entry.vote_count)}</dd>
            </div>
            <div>
              <dt>CLICKS</dt>
              <dd className="tabular mt-1 text-16">{number(entry.click_count)}</dd>
            </div>
            <div>
              <dt>SLOT</dt>
              <dd className="tabular mt-1 text-16">{pad(entry.slot_number ?? 0)}</dd>
            </div>
            <div>
              <dt>SUBMITTED</dt>
              <dd className="tabular mt-1 text-16">{stamp(entry.submitted_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-8">
          <SoloPlayer entry={entry} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/?e=${entry.slug}`} className="btn btn-solid">
            Open in the feed
          </Link>
          <Link href="/leaderboard" className="btn">
            Full standings
          </Link>
        </div>
      </main>

      <SiteFooter seasonName={season?.name} />
    </div>
  );
}
