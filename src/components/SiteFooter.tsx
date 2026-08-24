import Link from "next/link";

export function SiteFooter({ seasonName }: { seasonName?: string | null }) {
  return (
    <footer className="rule-t mt-16">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="marginalia opacity-60">
          {(seasonName ?? "Season one").toUpperCase()} / 25 SLOTS
        </span>
        <span className="marginalia flex gap-4 opacity-60">
          <Link href="/dare" className="hover:opacity-100">
            RULES
          </Link>
          <Link href="/leaderboard" className="hover:opacity-100">
            RECORD
          </Link>
          <Link href="/apply" className="hover:opacity-100">
            ENTER
          </Link>
        </span>
      </div>
    </footer>
  );
}
