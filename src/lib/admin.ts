import "server-only";

import { cookies } from "next/headers";

import { verifyAdminSession } from "@/lib/tokens";

export const ADMIN_COOKIE = "dair_admin";

/** Server-side only. The password is never sent to or checked in the client. */
export function isAdmin(): boolean {
  return verifyAdminSession(cookies().get(ADMIN_COOKIE)?.value);
}
