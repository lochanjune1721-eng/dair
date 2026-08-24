import Link from "next/link";

const NAV = [
  { href: "/", label: "Feed" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dare", label: "The dare" },
  { href: "/apply", label: "Apply" },
];

/** Institutional chrome. Paper, hairlines, mono labels. */
export function SiteHeader({
  seasonName,
  current,
}: {
  seasonName?: string | null;
  current?: string;
}) {
  return (
    <header className="rule-b bg-paper">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="font-display text-24 tracking-[-0.02em]">
            DAIR
          </Link>
          <span className="marginalia hidden opacity-60 sm:inline">
            {(seasonName ?? "Season one").toUpperCase()}
          </span>
        </div>
        <nav className="flex items-center gap-4 sm:gap-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current === item.href ? "page" : undefined}
              className={`marginalia ${
                current === item.href ? "underline underline-offset-4" : "opacity-60 hover:opacity-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
