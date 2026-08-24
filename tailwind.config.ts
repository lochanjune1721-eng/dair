import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Five colours. No sixth. No gradients, no shadows.
    colors: {
      paper: "rgb(var(--paper-rgb) / <alpha-value>)",
      ink: "rgb(var(--ink-rgb) / <alpha-value>)",
      rule: "rgb(var(--rule-rgb) / <alpha-value>)",
      live: "rgb(var(--live-rgb) / <alpha-value>)",
      field: "rgb(var(--field-rgb) / <alpha-value>)",
      transparent: "transparent",
      current: "currentColor",
    },
    borderRadius: {
      none: "0",
      full: "9999px", // logos only
    },
    boxShadow: { none: "none" },
    fontSize: {
      // 12 / 14 / 16 / 24 / 48 / 96 / 180
      "12": ["12px", { lineHeight: "1.4" }],
      "14": ["14px", { lineHeight: "1.45" }],
      "16": ["16px", { lineHeight: "1.5" }],
      "24": ["24px", { lineHeight: "1.15" }],
      "48": ["48px", { lineHeight: "0.9", letterSpacing: "-0.02em" }],
      "96": ["96px", { lineHeight: "0.85", letterSpacing: "-0.03em" }],
      "180": ["180px", { lineHeight: "0.85", letterSpacing: "-0.04em" }],
    },
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderColor: { DEFAULT: "var(--rule)" },
      maxWidth: { column: "420px" },
    },
  },
  plugins: [],
};

export default config;
