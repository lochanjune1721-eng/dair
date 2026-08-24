// Server-only environment access. Importing this from a client component is a
// build error by design (see the "server-only" guard in supabase/admin.ts).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  get stripeConnectAccountId() {
    return required("STRIPE_CONNECT_ACCOUNT_ID");
  },
  get fingerprintSalt() {
    return required("FINGERPRINT_SALT");
  },
  get adminPassword() {
    return required("ADMIN_PASSWORD");
  },
  // Upload tokens are HMACs. A dedicated secret is preferred; the fingerprint
  // salt is domain-separated as a fallback so the app runs on the documented
  // env list alone.
  get uploadTokenSecret() {
    return process.env.UPLOAD_TOKEN_SECRET || required("FINGERPRINT_SALT");
  },
  get siteUrl() {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL;
    if (explicit) return explicit.replace(/\/$/, "");
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
  },
  get cronSecret() {
    return process.env.CRON_SECRET || "";
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY || "";
  },
  get mailFrom() {
    return process.env.MAIL_FROM || "Dair <onboarding@resend.dev>";
  },
};

export const SLOT_PRICE_USD = 1000;
export const SLOT_PRICE_CENTS = SLOT_PRICE_USD * 100;
export const RESERVATION_MINUTES = 30;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
