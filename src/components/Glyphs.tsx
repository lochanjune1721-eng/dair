/** Geometric, hairline, no rounded corners. A ballot mark, not a heart. */

export function BallotMark({ filled, size = 28 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        fill={filled ? "var(--live)" : "none"}
        stroke={filled ? "var(--live)" : "currentColor"}
        strokeWidth="1.5"
      />
      <path
        d="M5.5 12.5 10 17 18.5 7"
        fill="none"
        stroke={filled ? "var(--paper)" : "currentColor"}
        strokeWidth="1.75"
      />
    </svg>
  );
}

export function ShareMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 16V3M12 3 7 8M12 3l5 5M3.5 14v6.5h17V14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function OutboundMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 15 20 4M14 4h6v6M20 13.5V20H4V4h6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function SoundMark({ muted, size = 24 }: { muted: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 9h4l5-4v14l-5-4H4V9Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="miter"
      />
      {muted ? (
        <path d="m17 9 5 6M22 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      ) : (
        <path
          d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}
