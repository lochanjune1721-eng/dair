"use client";

import { useCallback, useRef, useState } from "react";

import { MAX_LOGO_BYTES, MAX_VIDEO_BYTES } from "@/lib/limits";
import { logoUrl, videoUrl } from "@/lib/supabase/public";

type Phase = "idle" | "checking" | "uploading" | "saving" | "done" | "error";

interface Probe {
  width: number;
  height: number;
  duration: number;
}

/** Reads dimensions and duration from the file itself, before any upload. */
function probeVideo(file: File): Promise<Probe> {
  return new Promise((resolve, reject) => {
    const element = document.createElement("video");
    const url = URL.createObjectURL(file);
    element.preload = "metadata";
    element.muted = true;

    element.onloadedmetadata = () => {
      const probe = {
        width: element.videoWidth,
        height: element.videoHeight,
        duration: element.duration,
      };
      URL.revokeObjectURL(url);
      resolve(probe);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as a video."));
    };
    element.src = url;
  });
}

function putWithProgress(url: string, file: File, onProgress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url, true);
    request.setRequestHeader("content-type", file.type || "application/octet-stream");
    request.setRequestHeader("x-upsert", "true");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${request.status}).`));
    request.onerror = () => reject(new Error("Upload failed. Check your connection."));
    request.send(file);
  });
}

export function UploadClient({
  token,
  companyName,
  slotNumber,
  existingVideo,
  existingLogo,
}: {
  token: string;
  companyName: string;
  slotNumber: number | null;
  existingVideo: string | null;
  existingLogo: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState(existingVideo);
  const [logoPath, setLogoPath] = useState(existingLogo);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const logoInput = useRef<HTMLInputElement | null>(null);

  const upload = useCallback(
    async (file: File, kind: "video" | "logo") => {
      setError(null);
      setProgress(0);
      setPhase("checking");

      try {
        if (kind === "video") {
          if (file.size > MAX_VIDEO_BYTES) {
            throw new Error(
              `Video must be under 50 MB and vertical. This one is ${Math.round(
                file.size / 1024 / 1024
              )} MB.`
            );
          }
          const probe = await probeVideo(file);
          if (probe.height <= probe.width) {
            throw new Error(
              `Video must be under 50 MB and vertical. This one is ${probe.width}×${probe.height}.`
            );
          }

          const signed = await sign(token, kind, file);
          setPhase("uploading");
          await putWithProgress(signed.signedUrl, file, setProgress);

          setPhase("saving");
          await complete(token, kind, signed.path, Math.round(probe.duration));
          setVideoPath(signed.path);
        } else {
          if (file.size > MAX_LOGO_BYTES) throw new Error("Logo must be under 2 MB.");

          const signed = await sign(token, kind, file);
          setPhase("uploading");
          await putWithProgress(signed.signedUrl, file, setProgress);

          setPhase("saving");
          await complete(token, kind, signed.path);
          setLogoPath(signed.path);
        }

        setPhase("done");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Upload failed.");
        setPhase("error");
      }
    },
    [token]
  );

  const busy = phase === "checking" || phase === "uploading" || phase === "saving";

  return (
    <div>
      <div className="rule-b flex flex-wrap items-baseline justify-between gap-4 pb-4">
        <div>
          <p className="marginalia opacity-60">
            SLOT {slotNumber ? String(slotNumber).padStart(2, "0") : "--"} / 25
          </p>
          <h1 className="mt-2 font-display text-48">{companyName.toUpperCase()}</h1>
        </div>
        <p className="marginalia max-w-[32ch] opacity-70">
          One vertical video. 9:16. Under 50 MB. You can replace it until the season closes.
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !busy) void upload(file, "video");
        }}
        className={`mt-8 flex min-h-[220px] flex-col items-center justify-center gap-3 border border-dashed p-8 text-center ${
          dragging ? "border-ink" : ""
        }`}
      >
        <p className="text-16">Drop your video here</p>
        <p className="marginalia opacity-60">MP4, MOV OR WEBM / UNDER 50 MB / VERTICAL</p>
        <button
          type="button"
          className="btn mt-2"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          Choose a file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="sr-only absolute h-0 w-0 opacity-0"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file, "video");
            event.target.value = "";
          }}
        />
      </div>

      {busy ? (
        <div className="mt-6">
          <div className="marginalia flex justify-between opacity-70">
            <span>
              {phase === "checking" ? "CHECKING" : phase === "saving" ? "SAVING" : "UPLOADING"}
            </span>
            <span className="tabular">{String(Math.round(progress * 100)).padStart(3, "0")}%</span>
          </div>
          <div className="mt-2 h-2 w-full border" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-ink" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="marginalia mt-6 text-live">
          {error}
        </p>
      ) : null}

      {phase === "done" ? (
        <p role="status" className="marginalia mt-6">
          Received. Your entry is queued for approval.
        </p>
      ) : null}

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="marginalia opacity-60">CURRENT VIDEO</p>
          {videoPath ? (
            <video
              src={videoUrl(videoPath) ?? undefined}
              className="mt-3 aspect-[9/16] w-[180px] bg-field object-contain"
              controls
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <p className="mt-3 text-14 opacity-60">Nothing uploaded yet.</p>
          )}
        </div>

        <div>
          <p className="marginalia opacity-60">LOGO — OPTIONAL</p>
          <div className="mt-3 flex items-center gap-4">
            {logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl(logoPath) ?? undefined}
                alt=""
                className="h-14 w-14 rounded-full border object-cover"
              />
            ) : (
              <span className="marginalia flex h-14 w-14 items-center justify-center rounded-full border opacity-50">
                NONE
              </span>
            )}
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => logoInput.current?.click()}
            >
              {logoPath ? "Replace logo" : "Add logo"}
            </button>
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only absolute h-0 w-0 opacity-0"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file, "logo");
                event.target.value = "";
              }}
            />
          </div>
          <p className="marginalia mt-3 opacity-60">SQUARE, UNDER 2 MB. SHOWN AS A CIRCLE.</p>
        </div>
      </div>
    </div>
  );
}

async function sign(token: string, kind: "video" | "logo", file: File) {
  const response = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token,
      kind,
      size: file.size,
      contentType: file.type,
      filename: file.name,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Could not start the upload.");
  return data as { bucket: string; path: string; token: string; signedUrl: string };
}

async function complete(token: string, kind: "video" | "logo", path: string, duration?: number) {
  const response = await fetch("/api/upload/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, kind, path, duration }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Could not save the upload.");
}
