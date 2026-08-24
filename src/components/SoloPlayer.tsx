"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { OutboundMark, ShareMark, SoundMark } from "@/components/Glyphs";
import { VoteControl } from "@/components/feed/VoteControl";
import { hostname, number, pad, stamp } from "@/lib/format";
import { logoUrl, videoUrl } from "@/lib/supabase/public";
import type { PublicEntry } from "@/lib/types";

/** Same player as the feed, one entry, no scroll container. */
export function SoloPlayer({ entry: initial }: { entry: PublicEntry }) {
  const [entry, setEntry] = useState(initial);
  const [muted, setMuted] = useState(true);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewLogged = useRef(false);

  const src = videoUrl(entry.video_path);
  const logo = logoUrl(entry.logo_path);

  useEffect(() => {
    fetch("/api/vote")
      .then((response) => (response.ok ? response.json() : { voted: [] }))
      .then((data: { voted: string[] }) => setVoted(data.voted.includes(entry.id)))
      .catch(() => {});
  }, [entry.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (viewLogged.current) return;
      viewLogged.current = true;
      void fetch("/api/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }),
      }).catch(() => {});
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [entry.id]);

  const vote = useCallback(async () => {
    if (voted || pending) return;
    const before = entry.vote_count;
    setVoted(true);
    setPending(true);
    setEntry((current) => ({ ...current, vote_count: current.vote_count + 1 }));

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setVoted(false);
        setEntry((current) => ({ ...current, vote_count: before }));
        return;
      }
      if (typeof data.voteCount === "number") {
        setEntry((current) => ({ ...current, vote_count: data.voteCount }));
      }
    } catch {
      setVoted(false);
      setEntry((current) => ({ ...current, vote_count: before }));
    } finally {
      setPending(false);
    }
  }, [entry.id, entry.vote_count, pending, voted]);

  const outbound = useCallback(async () => {
    const tab = window.open("", "_blank", "noopener,noreferrer");
    setEntry((current) => ({ ...current, click_count: current.click_count + 1 }));
    try {
      const response = await fetch("/api/click", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }),
      });
      const data = await response.json().catch(() => ({}));
      const url = data.url ?? entry.company_url;
      if (tab && url) tab.location.href = url;
    } catch {
      if (tab && entry.company_url) tab.location.href = entry.company_url;
    }
  }, [entry.company_url, entry.id]);

  const share = useCallback(async () => {
    const url = window.location.href;
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
  }, [entry.company_name]);

  return (
    <div className="flex flex-col items-center gap-6 bg-field p-4 sm:flex-row sm:items-start sm:justify-center sm:gap-10 sm:p-8">
      <div className="relative aspect-[9/16] w-full max-w-[360px] sm:w-[380px]">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            className="h-full w-full bg-field object-contain"
            playsInline
            muted={muted}
            loop
            autoPlay
            preload="metadata"
            controls={false}
            onClick={() => setMuted((value) => !value)}
          >
            <track kind="captions" label="Captions" srcLang="en" />
          </video>
        ) : (
          <div className="marginalia flex h-full w-full items-center justify-center text-paper/50">
            NO VIDEO
          </div>
        )}

        <div className="marginalia pointer-events-none absolute left-3 top-3 text-paper/60">
          ENTRY {pad(entry.slot_number ?? 0)} / 25
        </div>
        <div className="marginalia pointer-events-none absolute right-3 top-3 text-paper/60">
          SUBMITTED {stamp(entry.submitted_at)}
        </div>

        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border border-paper/40 text-paper"
        >
          <SoundMark muted={muted} size={18} />
        </button>
      </div>

      <div className="w-full max-w-[360px] text-paper">
        <div className="flex items-start gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-10 w-10 rounded-full bg-paper object-cover" />
          ) : (
            <span className="tabular flex h-10 w-10 items-center justify-center rounded-full bg-paper text-12 text-ink">
              {pad(entry.slot_number ?? 0)}
            </span>
          )}
          <div>
            <div className="text-16 font-semibold">{entry.company_name}</div>
            {entry.product_tagline ? (
              <p className="mt-1 text-14 text-paper/70">{entry.product_tagline}</p>
            ) : null}
          </div>
        </div>

        {entry.company_url ? (
          <button
            type="button"
            onClick={() => void outbound()}
            className="marginalia mt-5 inline-flex items-center gap-2 border border-paper/40 px-3 py-2 text-paper hover:bg-paper hover:text-ink"
          >
            <OutboundMark size={14} />
            {hostname(entry.company_url)}
          </button>
        ) : null}

        <div className="mt-8 flex items-end gap-8">
          <VoteControl voted={voted} count={entry.vote_count} onVote={() => void vote()} pending={pending} />

          <button type="button" onClick={() => void share()} className="flex flex-col items-center gap-1">
            <span className="flex h-11 w-11 items-center justify-center border border-paper/40">
              <ShareMark size={20} />
            </span>
            <span className="marginalia text-paper/60">Share</span>
          </button>

          <div className="flex flex-col items-center gap-1">
            <span className="flex h-11 w-11 items-center justify-center border border-paper/40">
              <OutboundMark size={20} />
            </span>
            <span className="tabular text-12">{number(entry.click_count)}</span>
            <span className="marginalia text-paper/60">Clicks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
