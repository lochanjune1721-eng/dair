/** Every number on the site is monospaced and zero-padded where it reads as a record. */
export const pad = (n: number, width = 2) => String(Math.max(0, n)).padStart(width, "0");

export const number = (n: number) => new Intl.NumberFormat("en-US").format(n ?? 0);

/** SUBMITTED 21.08.26 */
export function stamp(iso: string | null): string {
  if (!iso) return "--.--.--";
  const d = new Date(iso);
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${yy}`;
}

export function countdownParts(target: string | null, now: number) {
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    done: false,
  };
}

/** Hostname only, for the outbound link label. */
export function hostname(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }
}

export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());
}
