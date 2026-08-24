import "server-only";

import { cookies } from "next/headers";

import { verifyAdminSession } from "@/lib/tokens";

export const ADMIN_COOKIE = "dair_admin";

/** Server-side only. The password is never sent to or checked in the client. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminSession(store.get(ADMIN_COOKIE)?.value);
}
