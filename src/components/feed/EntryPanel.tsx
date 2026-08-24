"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import { OutboundMark, ShareMark, SoundMark } from "@/components/Glyphs";
import { RankNumber } from "@/components/RankNumber";
import { VoteControl } from "@/components/feed/VoteControl";
import { hostname, number, pad, stamp } from "@/lib/format";
import { logoUrl, videoUrl } from "@/lib/supabase/public";
import type { PublicEntry } from "@/lib/types";

export interface PanelProps {
  entry: PublicEntry;
  rank: number;
  index: number;
  total: number;
  active: boolean;
  /** Only the active entry and the next two preload metadata. Never full files. */
  preload: "metadata" | "none";
  muted: boolean;
  voted: boolean;
  votePending: boolean;
  onToggleMute: () => void;
  onVote: (origin?: { x: number; y: number }) => void;
  onOutbound: () => void;
  onShare: () => void;
  onView: () => void;
}

export const EntryPanel = forwardRef<HTMLElement, PanelProps>(function EntryPanel(
  {
    entry,
    rank,
    index,
    total,
    active,
    preload,
    muted,
    voted,
    votePending,
    onToggleMute,
    onVote,
    onOutbound,
    onShare,
    onView,
  },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tapTimer = useRef<number | null>(null);
  // Held in a ref so the play/pause effect does not re-run on every render.
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  const viewTimer = useRef<number | null>(null);
  const viewLogged = useRef(false);
  const [mark, setMark] = useState<{ x: number; y: number; key: number } | null>(null);

  const src = videoUrl(entry.video_path);
  const logo = logoUrl(entry.logo_path);

  // Never two playing at once: only the active panel plays.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (active) {
      void video.play().catch(() => {});
      // A view counts after 2+ seconds of >=60% visibility.
      if (!viewLogged.current) {
        viewTimer.current = window.setTimeout(() => {
          viewLogged.current = true;
          onViewRef.current();
        }, 2000);
      }
    } else {
      video.pause();
      if (video.currentTime > 0) video.currentTime = 0;
      if (viewTimer.current) window.clearTimeout(viewTimer.current);
    }

    return () => {
      if (viewTimer.current) window.clearTimeout(viewTimer.current);
    };
  }, [active]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  /** Single tap toggles mute. Double tap votes, with the mark from the tap point. */
  const handleTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };

      if (tapTimer.current) {
        window.clearTimeout(tapTimer.current);
        tapTimer.current = null;
        if (!voted) {
          setMark({ ...point, key: Date.now() });
          window.setTimeout(() => setMark(null), 340);
        }
        onVote(point);
        return;
      }

      tapTimer.current = window.setTimeout(() => {
        tapTimer.current = null;
        onToggleMute();
      }, 240);
    },
    [onToggleMute, onVote, voted]
  );

  return (
    <section
      ref={ref}
      className="snap-item relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-field"
      aria-label={`Entry ${rank}: ${entry.company_name}`}
      data-slug={entry.slug}
    >
      {/* Mobile: the rank bleeds off the top-left corner, behind the video. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-4 -top-8 z-0 select-none text-paper/25 lg:hidden"
      >
        <RankNumber value={rank} size={180} />
      </div>

      <div className="relative z-10 flex h-full w-full items-center justify-center lg:gap-12">
        {/* Desktop: the rank sits in the letterbox to the left of the video. */}
        <div className="hidden shrink-0 select-none text-right text-paper lg:block">
          <RankNumber value={rank} size={180} ariaLabel={`Rank ${rank}`} />
          <div className="marginalia mt-2 text-paper/50">RANK</div>
        </div>

        <div className="relative flex h-full max-h-[100dvh] items-center">
          {/* 9:16 always, letterboxed in --field. Never cropped. */}
          <div
            className="relative aspect-[9/16] h-full max-h-[100dvh] w-auto max-w-[100vw] lg:h-[min(92dvh,760px)] lg:w-[420px]"
            onClick={handleTap}
            role="presentation"
          >
            {src ? (
              <video
                ref={videoRef}
                src={src}
                className="h-full w-full object-contain"
                playsInline
                muted={muted}
                loop
                preload={preload}
                controls={false}
                disablePictureInPicture
              >
                {/* Captions where provided. */}
                <track kind="captions" label="Captions" srcLang="en" />
              </video>
            ) : (
              <div className="marginalia flex h-full w-full items-center justify-center bg-field text-paper/50">
                NO VIDEO
              </div>
            )}

            {mark ? (
              <span
                key={mark.key}
                aria-hidden="true"
                className="vote-mark pointer-events-none absolute z-20 block h-16 w-16 border-2"
                style={{ left: mark.x, top: mark.y, borderColor: "var(--live)" }}
              />
            ) : null}

            {/* Marginalia. Real information, in the margins. */}
            <div className="marginalia pointer-events-none absolute left-3 top-12 z-10 text-paper/60 lg:top-3">
              ENTRY {pad(index + 1)} / {pad(total)}
            </div>
            <div className="marginalia pointer-events-none absolute right-3 top-12 z-10 hidden text-paper/60 sm:block lg:top-3">
              SUBMITTED {stamp(entry.submitted_at)}
            </div>

            {/* Bottom-left: who this is and where to go. */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 p-4 pb-16 pr-20 lg:pb-4">
              <div className="pointer-events-auto flex items-start gap-3">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-full bg-paper object-cover"
                  />
                ) : (
                  <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-12 text-ink">
                    {pad(entry.slot_number ?? index + 1)}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold text-paper">{entry.company_name}</div>
                  {entry.product_tagline ? (
                    <p className="mt-0.5 line-clamp-2 text-14 text-paper/70">
                      {entry.product_tagline}
                    </p>
                  ) : null}
                  {entry.company_url ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOutbound();
                      }}
                      className="marginalia mt-2 inline-flex items-center gap-2 border border-paper/40 px-2 py-1 text-paper hover:bg-paper hover:text-ink"
                    >
                      <OutboundMark size={14} />
                      {hostname(entry.company_url)}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Desktop: the rail sits in the letterbox, balancing the rank number. */}
        <div className="hidden shrink-0 flex-col items-center gap-5 self-end pb-8 lg:flex">
          <Rail
            voted={voted}
            votePending={votePending}
            entry={entry}
            muted={muted}
            onToggleMute={onToggleMute}
            onVote={() => onVote()}
            onShare={onShare}
          />
        </div>
      </div>

      <div className="absolute bottom-20 right-3 z-20 flex flex-col items-center gap-4 lg:hidden">
        <Rail
          voted={voted}
          votePending={votePending}
          entry={entry}
          muted={muted}
          onToggleMute={onToggleMute}
          onVote={() => onVote()}
          onShare={onShare}
        />
      </div>
    </section>
  );
});

function Rail({
  entry,
  voted,
  votePending,
  muted,
  onToggleMute,
  onVote,
  onShare,
}: {
  entry: PublicEntry;
  voted: boolean;
  votePending: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onVote: () => void;
  onShare: () => void;
}) {
  return (
    <>
      <VoteControl voted={voted} count={entry.vote_count} onVote={onVote} pending={votePending} />

      <button
        type="button"
        onClick={onShare}
        aria-label="Share this entry"
        className="flex flex-col items-center gap-1 text-paper"
      >
        <span className="flex h-11 w-11 items-center justify-center border border-paper/40">
          <ShareMark size={20} />
        </span>
        <span className="marginalia text-paper/60">Share</span>
      </button>

      <div className="flex flex-col items-center gap-1 text-paper">
        <span className="flex h-11 w-11 items-center justify-center border border-paper/40">
          <OutboundMark size={20} />
        </span>
        <span className="tabular text-12">{number(entry.click_count)}</span>
        <span className="marginalia text-paper/60">Clicks</span>
      </div>

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={!muted}
        className="flex flex-col items-center gap-1 text-paper"
      >
        <span className="flex h-11 w-11 items-center justify-center border border-paper/40">
          <SoundMark muted={muted} size={20} />
        </span>
        <span className="marginalia text-paper/60">{muted ? "Muted" : "Sound"}</span>
      </button>
    </>
  );
}
