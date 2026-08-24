import "server-only";

import { env } from "@/lib/env";

/**
 * Sends the post-payment upload link. Uses Resend when RESEND_API_KEY is set;
 * otherwise logs the link so it can be recovered from the server logs or the
 * admin table, which always shows a copyable upload link per entry.
 */
export async function sendUploadLink(to: string, companyName: string, url: string) {
  const subject = "Your slot is confirmed. Upload your video.";
  const text = [
    `${companyName} — slot confirmed.`,
    "",
    "Upload your entry here. The link is yours alone and expires in 14 days.",
    url,
    "",
    "Requirements: one vertical video, 9:16, under 50 MB.",
    "",
    "Dair",
  ].join("\n");

  if (!env.resendApiKey) {
    console.warn(`[mail] RESEND_API_KEY unset. Upload link for ${to}: ${url}`);
    return { delivered: false as const, url };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: env.mailFrom, to: [to], subject, text }),
  });

  if (!response.ok) {
    console.error(`[mail] send failed (${response.status}): ${await response.text()}`);
    return { delivered: false as const, url };
  }
  return { delivered: true as const, url };
}
