import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { UploadClient } from "@/components/upload/UploadClient";
import { getActiveSeason } from "@/lib/queries";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyUploadToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Upload", robots: { index: false, follow: false } };

function Refused({ heading, detail }: { heading: string; detail: string }) {
  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-16 sm:px-6">
      <p className="marginalia opacity-60">UPLOAD</p>
      <h1 className="mt-4 max-w-[16ch] font-display text-48">{heading}</h1>
      <p className="mt-4 max-w-[52ch]">{detail}</p>
      <Link href="/" className="btn mt-8">
        Back to the feed
      </Link>
    </main>
  );
}

export default async function UploadPage({ params }: { params: { token: string } }) {
  const season = await getActiveSeason();
  const verified = verifyUploadToken(params.token);

  const chrome = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader seasonName={season?.name} />
      {children}
      <SiteFooter seasonName={season?.name} />
    </div>
  );

  if (!verified.ok) {
    return chrome(
      <Refused
        heading={verified.reason === "expired" ? "THIS LINK HAS EXPIRED" : "THIS LINK IS NOT VALID"}
        detail={
          verified.reason === "expired"
            ? "Upload links last fourteen days. Reply to your Stripe receipt and a new one will be issued."
            : "Use the link sent to the address you paid with. Nothing else opens this page."
        }
      />
    );
  }

  const { data: entry } = await supabaseAdmin()
    .from("entries")
    .select("id,company_name,slot_number,status,video_path,logo_path")
    .eq("id", verified.entryId)
    .maybeSingle();

  if (!entry) {
    return chrome(<Refused heading="ENTRY NOT FOUND" detail="This entry no longer exists." />);
  }

  if (entry.slot_number === null || !["paid", "submitted", "approved"].includes(entry.status)) {
    return chrome(
      <Refused
        heading="THIS ENTRY IS NOT PAID"
        detail="Uploads open once payment clears. If you have paid, the confirmation email carries the working link."
      />
    );
  }

  return chrome(
    <main className="mx-auto w-full max-w-[860px] flex-1 px-4 py-10 sm:px-6">
      <UploadClient
        token={params.token}
        companyName={entry.company_name}
        slotNumber={entry.slot_number}
        existingVideo={entry.video_path}
        existingLogo={entry.logo_path}
      />
    </main>
  );
}
