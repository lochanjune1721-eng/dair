"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { stamp } from "@/lib/format";
import { videoUrl } from "@/lib/supabase/public";
import type { Entry } from "@/lib/types";

async function call(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/entries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Action failed.");
  return data;
}

export function EntryRow({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [tagline, setTagline] = useState(entry.product_tagline ?? "");
  const [url, setUrl] = useState(entry.company_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);

  async function run(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const data = await call({ entryId: entry.id, ...payload });
      if (data.uploadUrl) setUploadUrl(data.uploadUrl);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const video = videoUrl(entry.video_path);

  return (
    <tr className="rule-b align-top">
      <td className="py-3 pr-3 tabular">
        {entry.slot_number ? String(entry.slot_number).padStart(2, "0") : "--"}
      </td>

      <td className="py-3 pr-3">
        <div className="font-medium">{entry.company_name}</div>
        <div className="marginalia opacity-60">{entry.contact_email}</div>
        {editing ? (
          <div className="mt-2 grid gap-2">
            <input
              value={tagline}
              maxLength={100}
              placeholder="Tagline"
              onChange={(e) => setTagline(e.target.value)}
            />
            <input value={url} placeholder="URL" onChange={(e) => setUrl(e.target.value)} />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={async () => {
                  await run({ action: "update", productTagline: tagline, companyUrl: url });
                  setEditing(false);
                }}
              >
                Save
              </button>
              <button type="button" className="btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1 max-w-[36ch] text-14 opacity-70">
            {entry.product_tagline || "No tagline"}
          </div>
        )}
        {error ? (
          <p role="alert" className="marginalia mt-2 text-live">
            {error}
          </p>
        ) : null}
        {uploadUrl ? (
          <p className="marginalia mt-2 break-all">
            <a className="underline underline-offset-4" href={uploadUrl}>
              {uploadUrl}
            </a>
          </p>
        ) : null}
      </td>

      <td className="py-3 pr-3">
        {video ? (
          <video
            src={video}
            className="h-[96px] w-[54px] bg-field object-contain"
            muted
            loop
            playsInline
            preload="metadata"
            controls={false}
            onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => e.currentTarget.pause()}
          />
        ) : (
          <div className="marginalia flex h-[96px] w-[54px] items-center justify-center bg-field text-center text-paper opacity-70">
            NO
            <br />
            VIDEO
          </div>
        )}
      </td>

      <td className="py-3 pr-3">
        <span className="marginalia">{entry.status.toUpperCase()}</span>
        <div className="marginalia mt-1 opacity-60">{stamp(entry.submitted_at ?? entry.created_at)}</div>
      </td>

      <td className="py-3 pr-3 tabular text-right">{entry.vote_count}</td>
      <td className="py-3 pr-3 tabular text-right">{entry.click_count}</td>

      <td className="py-3">
        <div className="flex flex-wrap justify-end gap-2">
          {entry.status !== "approved" ? (
            <button
              type="button"
              className="btn"
              disabled={busy || !entry.video_path}
              onClick={() => run({ action: "approve" })}
            >
              Approve
            </button>
          ) : null}
          {entry.status !== "rejected" ? (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => run({ action: "reject" })}
            >
              Reject
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => setEditing((v) => !v)}>
            Edit
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => run({ action: "upload_link" })}
          >
            Upload link
          </button>
          {entry.slot_number === null ? (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => run({ action: "delete" })}
            >
              Delete
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
