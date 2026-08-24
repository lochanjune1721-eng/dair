"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Incorrect password.");
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 w-full max-w-[360px]">
      <p className="marginalia opacity-60">RESTRICTED</p>
      <h1 className="mt-3 font-display text-48">OFFICIALS ONLY</h1>
      <label className="mt-8 block">
        <span className="marginalia opacity-60">Password</span>
        <input
          type="password"
          className="mt-2"
          value={password}
          autoFocus
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? (
        <p role="alert" className="marginalia mt-3 text-live">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-solid mt-6 w-full" disabled={pending}>
        {pending ? "Checking" : "Enter"}
      </button>
    </form>
  );
}
