import "server-only";

import crypto from "node:crypto";

import { env } from "@/lib/env";

/**
 * Upload tokens: `<entryId>.<expiryEpochSeconds>.<hmac>`, base64url payload.
 * Emailed after payment; the only way to reach /upload/[token].
 */
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", `upload-token:${env.uploadTokenSecret}`)
    .update(payload)
    .digest("base64url");
}

export function createUploadToken(entryId: string, ttlSeconds = TOKEN_TTL_SECONDS): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${entryId}.${expires}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export type TokenResult =
  | { ok: true; entryId: string }
  | { ok: false; reason: "malformed" | "invalid" | "expired" };

export function verifyUploadToken(token: string): TokenResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  let payload: string;
  try {
    payload = Buffer.from(parts[0]!, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const [entryId, expiresRaw] = payload.split(".");
  if (!entryId || !expiresRaw) return { ok: false, reason: "malformed" };

  const expected = sign(payload);
  const given = parts[1]!;
  if (
    expected.length !== given.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (Number(expiresRaw) * 1000 < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, entryId };
}

/** Admin session cookie: `<expiry>.<hmac>`, httpOnly, checked server-side. */
const ADMIN_TTL_SECONDS = 60 * 60 * 12;

function signAdmin(payload: string): string {
  return crypto
    .createHmac("sha256", `admin-session:${env.adminPassword}:${env.uploadTokenSecret}`)
    .update(payload)
    .digest("base64url");
}

export function createAdminSession(): string {
  const expires = String(Math.floor(Date.now() / 1000) + ADMIN_TTL_SECONDS);
  return `${expires}.${signAdmin(expires)}`;
}

export function verifyAdminSession(value: string | undefined | null): boolean {
  if (!value) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig) return false;
  if (Number(expires) * 1000 < Date.now()) return false;
  const expected = signAdmin(expires);
  if (expected.length !== sig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

/** Constant-time password compare. */
export function passwordMatches(given: string): boolean {
  const expected = env.adminPassword;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
