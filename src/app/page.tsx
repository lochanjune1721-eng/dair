import { FeedClient } from "@/components/feed/FeedClient";
import { getActiveSeason, getApprovedEntries } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function FeedPage({ searchParams }: { searchParams: { e?: string } }) {
  const season = await getActiveSeason();

  if (!season) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-field px-6 text-paper">
        <p className="marginalia text-paper/60">NO SEASON OPEN</p>
        <p className="mt-6 max-w-[20ch] text-center font-display text-48">
          THE TOURNAMENT IS BETWEEN SEASONS
        </p>
      </main>
    );
  }

  const entries = await getApprovedEntries(season.id, "top");

  return (
    <FeedClient
      initialEntries={entries}
      seasonName={season.name}
      dareText={season.dare_text}
      initialSlug={searchParams.e}
    />
  );
}
