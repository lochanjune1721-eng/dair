import type { Metadata } from "next";

import { AdminLogin } from "@/components/admin/AdminLogin";
import { EntryRow } from "@/components/admin/EntryRow";
import { GrantSlotForm } from "@/components/admin/GrantSlotForm";
import { isAdmin } from "@/lib/admin";
import { getActiveSeason, getAllEntries, getSlotsTaken } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  // Checked server-side. The password never reaches the client.
  if (!(await isAdmin())) {
    return (
      <main className="min-h-screen px-4">
        <AdminLogin />
      </main>
    );
  }

  const season = await getActiveSeason();
  if (!season) {
    return (
      <main className="min-h-screen px-6 py-16">
        <h1 className="font-display text-48">NO ACTIVE SEASON</h1>
        <p className="mt-4 max-w-[52ch]">
          Insert a row into <code className="tabular">seasons</code> with{" "}
          <code className="tabular">is_active = true</code>. The schema in{" "}
          <code className="tabular">supabase/schema.sql</code> seeds one.
        </p>
      </main>
    );
  }

  const entries = await getAllEntries(season.id);
  const taken = await getSlotsTaken(season.id);
  const counts = entries.reduce<Record<string, number>>((totals, entry) => {
    totals[entry.status] = (totals[entry.status] ?? 0) + 1;
    return totals;
  }, {});

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="rule-b flex flex-wrap items-baseline justify-between gap-4 pb-4">
        <div>
          <p className="marginalia opacity-60">{season.name.toUpperCase()} / CONTROL</p>
          <h1 className="mt-2 font-display text-48">ENTRIES</h1>
        </div>
        <div className="marginalia flex gap-6 opacity-70">
          <span>
            SLOTS <span className="tabular">{String(taken).padStart(2, "0")}</span>/
            <span className="tabular">{season.total_slots}</span>
          </span>
          {(["submitted", "approved", "paid", "reserved", "rejected"] as const).map((status) => (
            <span key={status}>
              {status.toUpperCase()}{" "}
              <span className="tabular">{String(counts[status] ?? 0).padStart(2, "0")}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-14">
          <thead>
            <tr className="rule-b marginalia text-left opacity-60">
              <th className="py-2 pr-3 font-normal">Slot</th>
              <th className="py-2 pr-3 font-normal">Company</th>
              <th className="py-2 pr-3 font-normal">Video</th>
              <th className="py-2 pr-3 font-normal">Status</th>
              <th className="py-2 pr-3 text-right font-normal">Votes</th>
              <th className="py-2 pr-3 text-right font-normal">Clicks</th>
              <th className="py-2 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 opacity-60">
                  No entries yet. Grant a free slot below to seed the feed.
                </td>
              </tr>
            ) : (
              entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-12 max-w-[720px]">
        <GrantSlotForm />
      </div>
    </main>
  );
}
