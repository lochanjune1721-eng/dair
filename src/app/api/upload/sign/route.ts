import { NextResponse, type NextRequest } from "next/server";

import { MAX_LOGO_BYTES, MAX_VIDEO_BYTES } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyUploadToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

const EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Issues a signed upload URL — only after confirming the entry is paid.
 * The buckets have no public write policy, so this route is the only way in.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const verified = verifyUploadToken(String(body.token ?? ""));
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.reason === "expired" ? "This link has expired." : "This link is not valid." },
      { status: 403 }
    );
  }

  const kind = body.kind === "logo" ? "logo" : "video";
  const size = Number(body.size ?? 0);
  const contentType = String(body.contentType ?? "");

  const db = supabaseAdmin();
  const { data: entry } = await db
    .from("entries")
    .select("id,slug,status,slot_number")
    .eq("id", verified.entryId)
    .maybeSingle();

  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  // Payment is the gate. A reserved entry has not paid.
  if (!["paid", "submitted", "approved"].includes(entry.status) || entry.slot_number === null) {
    return NextResponse.json({ error: "This entry is not paid." }, { status: 403 });
  }

  if (kind === "video") {
    if (!VIDEO_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Video must be MP4, MOV or WebM." }, { status: 400 });
    }
    if (!size || size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        {
          error: `Video must be under 50 MB and vertical. This one is ${Math.round(
            size / 1024 / 1024
          )} MB.`,
        },
        { status: 400 }
      );
    }
  } else {
    if (!LOGO_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Logo must be PNG, JPG, WebP or SVG." }, { status: 400 });
    }
    if (!size || size > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: "Logo must be under 2 MB." }, { status: 400 });
    }
  }

  const bucket = kind === "video" ? "videos" : "logos";
  const extension = EXTENSIONS[contentType] ?? "bin";
  // Stamped path so a re-upload never collides with a cached object.
  const path = `${entry.slug}/${Date.now()}.${extension}`;

  const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[upload/sign] failed", error);
    return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });
  }

  return NextResponse.json({
    bucket,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  });
}
