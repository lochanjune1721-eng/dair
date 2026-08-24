"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EMPTY = { companyName: "", companyUrl: "", contactEmail: "", productTagline: "" };

/** Seeds an entry without payment, so the feed has something in it on day one. */
export function GrantSlotForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setUploadUrl(null);

    const response = await fetch("/api/admin/entries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "grant", ...values }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Could not create the entry.");
      setPending(false);
      return;
    }

    setValues(EMPTY);
    setUploadUrl(data.uploadUrl ?? null);
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rule-t pt-6">
      <p className="marginalia opacity-60">GRANT A FREE SLOT</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Company name"
          required
          value={values.companyName}
          onChange={(e) => setValues((v) => ({ ...v, companyName: e.target.value }))}
        />
        <input
          placeholder="Company URL"
          value={values.companyUrl}
          onChange={(e) => setValues((v) => ({ ...v, companyUrl: e.target.value }))}
        />
        <input
          placeholder="Contact email"
          type="email"
          required
          value={values.contactEmail}
          onChange={(e) => setValues((v) => ({ ...v, contactEmail: e.target.value }))}
        />
        <input
          placeholder="Product tagline"
          maxLength={100}
          value={values.productTagline}
          onChange={(e) => setValues((v) => ({ ...v, productTagline: e.target.value }))}
        />
      </div>

      {error ? (
        <p role="alert" className="marginalia mt-3 text-live">
          {error}
        </p>
      ) : null}

      {uploadUrl ? (
        <p className="marginalia mt-3 break-all">
          Upload link — send it to them:{" "}
          <a className="underline underline-offset-4" href={uploadUrl}>
            {uploadUrl}
          </a>
        </p>
      ) : null}

      <button type="submit" className="btn mt-4" disabled={pending}>
        {pending ? "Creating" : "Grant slot"}
      </button>
    </form>
  );
}
