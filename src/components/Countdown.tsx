"use client";

import { useSyncExternalStore } from "react";

import { countdownParts, pad } from "@/lib/format";

/**
 * Time is an external mutable source, so it is read through
 * useSyncExternalStore rather than mirrored into state from an effect. The
 * server snapshot is null, which renders the placeholder and keeps hydration
 * from mismatching a clock that has already moved.
 */
let listeners: Array<() => void> = [];
let currentTime = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  currentTime = Date.now();
  listeners.push(listener);

  if (timer === null) {
    timer = setInterval(() => {
      currentTime = Date.now();
      for (const notify of listeners) notify();
    }, 1000);
  }

  return () => {
    listeners = listeners.filter((candidate) => candidate !== listener);
    if (listeners.length === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => currentTime;
const getServerSnapshot = () => null;

/** Ticks in mono. No animation beyond the digits changing. */
export function Countdown({ target }: { target: string | null }) {
  const now = useSyncExternalStore<number | null>(subscribe, getSnapshot, getServerSnapshot);

  if (!target) return <span className="tabular">NO DEADLINE SET</span>;
  if (now === null) return <span className="tabular">--:--:--:--</span>;

  const parts = countdownParts(target, now);
  if (!parts || parts.done) return <span className="tabular">CLOSED</span>;

  return (
    <span className="tabular" aria-label="Time remaining">
      {pad(parts.days, 3)}:{pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}
      <span className="marginalia ml-2 opacity-60">D:H:M:S</span>
    </span>
  );
}
