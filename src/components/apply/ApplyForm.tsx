"use client";

import { useState } from "react";

const FIELDS = [
  { name: "companyName", label: "Company name", type: "text", placeholder: "Northwind Robotics" },
  { name: "companyUrl", label: "Company URL", type: "text", placeholder: "northwind.com" },
  { name: "contactEmail", label: "Contact email", type: "email", placeholder: "ops@northwind.com" },
] as const;

export function ApplyForm({ remaining }: { remaining: number }) {
  const [values, setValues] = useState({
    companyName: "",
    companyUrl: "",
    contactEmail: "",
    productTagline: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const soldOut = remaining <= 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || soldOut) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setError(data.error ?? "Something did not go through. Try again.");
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something did not go through. Try again.");
      setPending(false);
    }
  }

  if (soldOut) {
    return (
      <div className="rule-t rule-b py-10">
        <p className="text-24">All 25 slots taken. Season two opens later.</p>
        <p className="mt-3 max-w-[52ch] opacity-70">
          Leave the page open if you like. Reservations that lapse are released every five minutes
          and the count above updates on reload.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-[520px]" noValidate>
      <div className="rule-t">
        {FIELDS.map((field) => (
          <label key={field.name} className="rule-b block py-4">
            <span className="marginalia block opacity-60">{field.label}</span>
            <input
              className="mt-2 border-0 px-0 py-1 text-16"
              type={field.type}
              name={field.name}
              required
              autoComplete={field.name === "contactEmail" ? "email" : "organization"}
              placeholder={field.placeholder}
              value={values[field.name]}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.name]: event.target.value }))
              }
            />
          </label>
        ))}

        <label className="rule-b block py-4">
          <span className="marginalia flex items-baseline justify-between opacity-60">
            <span>Product tagline</span>
            <span className="tabular">{String(values.productTagline.length).padStart(3, "0")}/100</span>
          </span>
          <input
            className="mt-2 border-0 px-0 py-1 text-16"
            type="text"
            name="productTagline"
            required
            maxLength={100}
            placeholder="Warehouse robots that do not need a supervisor."
            value={values.productTagline}
            onChange={(event) =>
              setValues((current) => ({ ...current, productTagline: event.target.value }))
            }
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="marginalia mt-4 text-live">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-solid" disabled={pending}>
          {pending ? "Opening checkout" : "Take a slot — $1,000"}
        </button>
        <span className="marginalia opacity-60">
          <span className="tabular">{String(remaining).padStart(2, "0")}</span> of{" "}
          <span className="tabular">25</span> remaining
        </span>
      </div>

      <p className="marginalia mt-6 max-w-[52ch] leading-relaxed opacity-60">
        Payment is taken by Stripe. Your slot is held for 30 minutes while you check out. After
        payment you receive an upload link by email.
      </p>
    </form>
  );
}
