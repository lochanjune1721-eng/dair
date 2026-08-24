"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EntryPanel } from "@/components/feed/EntryPanel";
import { FeedSidebar } from "@/components/feed/FeedSidebar";
import { useLiveEntries } from "@/hooks/useLiveEntries";
import { compareByRank } from "@/lib/rank";
import type { PublicEntry } from "@/lib/types";

type Order = "top" | "new";

export function FeedClient({
  initialEntries,
  seasonName,
  dareText,
  initialSlug,
}: {
  initialEntries: PublicEntry[];
  seasonName: string;
  dareText: string;
  initialSlug?: string;
}) {
  const { entries, applyLocal } = useLiveEntries(initialEntries);

  const [order, setOrder] = useState<Order>("top");
  const [muted, setMuted] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<Array<HTMLElement | null>>([]);
  const viewed = useRef<Set<string>>(new Set());
  const didInitialScroll = useRef(false);

  // Rank is always vote order, whatever the feed is sorted by.
  const ranked = useMemo(() => [...entries].sort(compareByRank), [entries]);
  const rankById = useMemo(() => {
    const map = new Map<string, number>();
    ranked.forEach((entry, index) => map.set(entry.id, index + 1));
    return map;
  }, [ranked]);

  const ordered = useMemo(() => {
    if (order === "top") return ranked;
    return [...entries].sort((a, b) => {
      const at = a.submitted_at ? Date.parse(a.submitted_at) : 0;
      const bt = b.submitted_at ? Date.parse(b.submitted_at) : 0;
      return bt - at;
    });
  }, [entries, order, ranked]);

  const totalVotes = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.vote_count, 0),
    [entries]
  );

  // Which entries this visitor has already voted for. The votes table has no
  // public SELECT policy, so this comes from a server route.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/vote")
      .then((response) => (response.ok ? response.json() : { voted: [] }))
      .then((data: { voted: string[] }) => {
        if (!cancelled) setVoted(new Set(data.voted));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Play the entry that is at least 60% visible; pause every other one.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (observations) => {
        let best: { index: number; ratio: number } | null = null;
        observations.forEach((observation) => {
          const index = Number((observation.target as HTMLElement).dataset.index ?? -1);
          if (index < 0 || observation.intersectionRatio < 0.6) return;
          if (!best || observation.intersectionRatio > best.ratio) {
            best = { index, ratio: observation.intersectionRatio };
          }
        });
        if (best) setActiveIndex((best as { index: number }).index);
      },
      { root, threshold: [0, 0.6, 0.9] }
    );

    panelRefs.current.forEach((panel) => panel && observer.observe(panel));
    return () => observer.disconnect();
  }, [ordered.length, order]);

  const scrollTo = useCallback((index: number) => {
    const panel = panelRefs.current[index];
    if (!panel) return;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Deep link from the leaderboard: /?e=slug
  useEffect(() => {
    if (didInitialScroll.current || !initialSlug) return;
    const index = ordered.findIndex((entry) => entry.slug === initialSlug);
    if (index > 0) {
      didInitialScroll.current = true;
      panelRefs.current[index]?.scrollIntoView({ block: "start" });
      setActiveIndex(index);
    } else if (index === 0) {
      didInitialScroll.current = true;
    }
  }, [initialSlug, ordered]);

  // Arrow keys navigate on desktop.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === "j") {
        event.preventDefault();
        scrollTo(Math.min(activeIndex + 1, ordered.length - 1));
      } else if (event.key === "ArrowUp" || event.key === "PageUp" || event.key === "k") {
        event.preventDefault();
        scrollTo(Math.max(activeIndex - 1, 0));
      } else if (event.key === "m") {
        setMuted((value) => !value);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, ordered.length, scrollTo]);

  /** Optimistic: fill and increment instantly, reconcile after. No unvoting. */
  const vote = useCallback(
    async (entry: PublicEntry) => {
      if (voted.has(entry.id) || pending.has(entry.id)) return;

      setVoted((current) => new Set(current).add(entry.id));
      setPending((current) => new Set(current).add(entry.id));
      applyLocal(entry.id, { vote_count: entry.vote_count + 1 });

      try {
        const response = await fetch("/api/vote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entryId: entry.id }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          // A 429 or a server error is a real rejection: roll the vote back.
          setVoted((current) => {
            const next = new Set(current);
            next.delete(entry.id);
            return next;
          });
          applyLocal(entry.id, { vote_count: entry.vote_count });
          return;
        }

        if (typeof data.voteCount === "number") {
          applyLocal(entry.id, { vote_count: data.voteCount });
        }
      } catch {
        setVoted((current) => {
          const next = new Set(current);
          next.delete(entry.id);
          return next;
        });
        applyLocal(entry.id, { vote_count: entry.vote_count });
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(entry.id);
          return next;
        });
      }
    },
    [applyLocal, pending, voted]
  );

  const outbound = useCallback(
    async (entry: PublicEntry) => {
      // Open synchronously so the popup blocker does not eat it.
      const tab = window.open("", "_blank", "noopener,noreferrer");
      applyLocal(entry.id, { click_count: entry.click_count + 1 });
      try {
        const response = await fetch("/api/click", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entryId: entry.id }),
        });
        const data = await response.json().catch(() => ({}));
        const url = data.url ?? entry.company_url;
        if (tab && url) tab.location.href = url;
        else if (!tab && url) window.location.href = url;
      } catch {
        if (tab && entry.company_url) tab.location.href = entry.company_url;
      }
    },
    [applyLocal]
  );

  const logView = useCallback((entry: PublicEntry) => {
    if (viewed.current.has(entry.id)) return;
    viewed.current.add(entry.id);
    void fetch("/api/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entryId: entry.id }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const share = useCallback(async (entry: PublicEntry) => {
    const url = `${window.location.origin}/e/${entry.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: entry.company_name, url });
        return;
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }
  }, []);

  if (entries.length === 0) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-field px-6 text-paper">
        <p className="marginalia text-paper/60">{seasonName.toUpperCase()}</p>
        <p className="mt-6 max-w-[24ch] text-center font-display text-48">{dareText}</p>
        <p className="mt-8 text-14 text-paper/70">No entries approved yet.</p>
        <Link href="/apply" className="btn mt-8 border-paper text-paper hover:bg-paper hover:text-ink">
          Take a slot — $1,000
        </Link>
      </main>
    );
  }

  const activeEntry = ordered[activeIndex] ?? ordered[0]!;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-field">
      <div className="relative flex-1">
        {/* Chrome over the feed. Mono labels, hairlines, no fill. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-3 sm:p-4">
          <div className="pointer-events-auto flex items-center gap-3">
            <Link href="/leaderboard" className="font-display text-24 text-paper">
              DAIR
            </Link>
            <span className="marginalia hidden text-paper/50 sm:inline">
              {seasonName.toUpperCase()}
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-0 border border-paper/40">
            {(["top", "new"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setOrder(value);
                  setActiveIndex(0);
                  containerRef.current?.scrollTo({ top: 0 });
                }}
                aria-pressed={order === value}
                className={`marginalia px-3 py-1.5 ${
                  order === value ? "bg-paper text-ink" : "text-paper/70"
                }`}
              >
                {value === "top" ? "Top" : "New"}
              </button>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between p-3 sm:p-4">
          <Link
            href="/leaderboard"
            className="marginalia pointer-events-auto border border-paper/40 px-2 py-1 text-paper hover:bg-paper hover:text-ink xl:hidden"
          >
            Leaderboard
          </Link>
          <span className="marginalia pointer-events-none ml-auto text-paper/50">
            <span className="tabular">{String(activeIndex + 1).padStart(2, "0")}</span> /{" "}
            <span className="tabular">{String(ordered.length).padStart(2, "0")}</span>
          </span>
        </div>

        <div ref={containerRef} className="snap-feed h-[100dvh] w-full">
          {ordered.map((entry, index) => (
            <EntryPanel
              key={entry.id}
              ref={(node) => {
                panelRefs.current[index] = node;
                if (node) node.dataset.index = String(index);
              }}
              entry={entry}
              rank={rankById.get(entry.id) ?? index + 1}
              index={index}
              total={ordered.length}
              active={index === activeIndex}
              preload={index >= activeIndex && index <= activeIndex + 2 ? "metadata" : "none"}
              muted={muted}
              voted={voted.has(entry.id)}
              votePending={pending.has(entry.id)}
              onToggleMute={() => setMuted((value) => !value)}
              onVote={() => void vote(entry)}
              onOutbound={() => void outbound(entry)}
              onShare={() => void share(entry)}
              onView={() => logView(entry)}
            />
          ))}
        </div>
      </div>

      <FeedSidebar
        entries={ranked}
        activeId={activeEntry?.id ?? null}
        totalVotes={totalVotes}
        onSelect={(id) => {
          const index = ordered.findIndex((entry) => entry.id === id);
          if (index >= 0) scrollTo(index);
        }}
      />
    </div>
  );
}
