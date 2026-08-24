"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The signature element: a rank set enormous in display type. When position
 * changes the digits flip like a split-flap board — steps() easing, no spring.
 * prefers-reduced-motion jumps straight to the value.
 */
export function RankNumber({
  value,
  size = 180,
  className = "",
  pad = 2,
  ariaLabel,
}: {
  value: number;
  size?: number;
  className?: string;
  pad?: number;
  ariaLabel?: string;
}) {
  const digits = String(Math.max(0, value)).padStart(pad, "0").split("");
  const previous = useRef<string[]>(digits);
  const [flipping, setFlipping] = useState<Record<number, "up" | "down">>({});
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const prev = previous.current;
    const next = String(Math.max(0, value)).padStart(pad, "0").split("");

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || prev.join("") === next.join("")) {
      previous.current = next;
      return;
    }

    // A lower rank number is a better position: flip up when climbing.
    const climbing = Number(next.join("")) < Number(prev.join(""));
    const changed: Record<number, "up" | "down"> = {};
    next.forEach((digit, index) => {
      if (prev[index] !== digit) changed[index] = climbing ? "up" : "down";
    });

    previous.current = next;
    setFlipping(changed);
    setNonce((n) => n + 1);

    const timer = window.setTimeout(() => setFlipping({}), 220);
    return () => window.clearTimeout(timer);
  }, [value, pad]);

  return (
    <span
      aria-label={ariaLabel ?? `Rank ${value}`}
      role="img"
      className={`flip-card font-display leading-[0.85] tracking-[-0.04em] ${className}`}
      style={{ fontSize: size, lineHeight: 0.85 }}
    >
      {digits.map((digit, index) => (
        <span
          key={`${index}-${nonce}-${digit}`}
          className={`flip-digit ${
            flipping[index] === "up" ? "flip-up" : flipping[index] === "down" ? "flip-down" : ""
          }`}
        >
          {digit}
        </span>
      ))}
    </span>
  );
}
