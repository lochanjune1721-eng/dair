import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { env } from "@/lib/env";

export const FINGERPRINT_COOKIE = "dair_fp";
export const FINGERPRINT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Reads the first-party fingerprint cookie. Set by middleware on first hit. */
export function readFingerprint(req?: NextRequest): string | null {
  const value = req
    ? req.cookies.get(FINGERPRINT_COOKIE)?.value
    : cookies().get(FINGERPRINT_COOKIE)?.value;
  if (!value) return null;
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

/** Best-effort client IP behind the platform proxy. */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

/** SHA-256 of IP + server-side salt. The raw IP is never stored. */
export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${env.fingerprintSalt}:${ip}`).digest("hex");
}

export function newFingerprint(): string {
  return crypto.randomUUID();
}
