"use client";

import { useEffect, useState } from "react";

import { countdownParts, pad } from "@/lib/format";

/** Ticks in mono. No animation beyond the digits changing. */
export function Countdown({ target }: { target: string | null }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
