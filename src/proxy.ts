import { NextResponse, type NextRequest } from "next/server";

const FINGERPRINT_COOKIE = "dair_fp";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Issues the first-party fingerprint cookie on the first request. Every vote,
 * view and rate-limit decision keys off it, so it must exist before the feed
 * renders rather than being minted lazily by the vote route.
 *
 * Named `proxy` in `proxy.ts`: Next 16 deprecated the `middleware` convention.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const existing = request.cookies.get(FINGERPRINT_COOKIE)?.value;

  if (!existing || !/^[0-9a-f-]{36}$/i.test(existing)) {
    response.cookies.set(FINGERPRINT_COOKIE, crypto.randomUUID(), {
      httpOnly: false, // the client reads it to reconcile optimistic votes
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|mp4)$).*)"],
};
