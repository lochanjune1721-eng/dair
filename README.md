# Dair

Twenty-five companies pay $1,000 each for a slot. All twenty-five attempt the same dare
while promoting their product. One vertical video each. Visitors vote. The leaderboard is
the record.

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Storage, Realtime) ·
Stripe Connect.

## Setup

1. **Install**

   ```bash
   npm install
   cp .env.example .env.local   # fill it in
   ```

2. **Database** — paste `supabase/schema.sql` into the Supabase SQL editor and run it. It is
   idempotent, so re-running is safe. It creates the tables, the counter triggers, the
   `claim_slot` locking function, the RLS policies, the two storage buckets, the realtime
   publication, and seeds one active season.

3. **Stripe** — point a webhook at `/api/stripe/webhook` listening for
   `checkout.session.completed`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.
   Locally:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Run**

   ```bash
   npm run dev
   ```

5. **Seed the feed** — open `/admin`, sign in with `ADMIN_PASSWORD`, and use *Grant slot* to
   create entries without payment. Each one hands back an upload link. Upload a video at
   that link, then approve the entry. Only approved entries appear publicly.

## Env

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public reads and realtime. RLS limits these to approved entries and seasons. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server routes only. Guarded by `server-only`, so importing it from a client component fails the build. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Checkout and webhook verification. |
| `STRIPE_CONNECT_ACCOUNT_ID` | Destination account for the transfer. |
| `FINGERPRINT_SALT` | Salts the IP hash. Also signs upload tokens unless `UPLOAD_TOKEN_SECRET` is set. |
| `ADMIN_PASSWORD` | Checked server-side in a route handler, exchanged for a signed httpOnly cookie. |
| `NEXT_PUBLIC_SITE_URL` | Absolute URL for Stripe redirects, upload links and OG metadata. |
| `CRON_SECRET` | Optional bearer token for `/api/cron/release-slots`, the manual cleanup endpoint. |
| `RESEND_API_KEY` / `MAIL_FROM` | Optional. Sends the post-payment upload link; without it the link is logged and remains copyable from `/admin`. |

## Pages

| Route | What it is |
| --- | --- |
| `/` | The feed. Scroll-snapped full-viewport 9:16 video, one entry per screen. |
| `/leaderboard` | Ruled fixture table, live over Supabase realtime. Rows deep-link into the feed. |
| `/e/[slug]` | Single entry, with an OG image carrying the current rank. |
| `/apply` | Reserves a slot for 30 minutes and opens Stripe Checkout. |
| `/upload/[token]` | Post-payment upload. Reachable only with a signed token. |
| `/dare` | The dare, the rules, the deadline, the disqualification conditions. |
| `/admin` | Approve, reject, edit, and grant free slots. |

## How the money and the slots work

`/apply` writes a `reserved` entry with `reserved_until = now() + 30 min` and opens Checkout.
Nothing is claimed yet — the reservation only keeps the remaining-slot count honest while the
visitor is paying.

On `checkout.session.completed` the webhook verifies the signature and calls `claim_slot`,
which in one transaction locks the entry, locks the season, locks every slot-holding row,
re-counts, and assigns `max(slot_number) + 1`. Two simultaneous payments cannot both claim
slot 25 — the loser gets an error and is flagged for refund rather than silently oversold.
The function is idempotent, so Stripe's retries are harmless.

There is no cron. A lapsed reservation releases its slot the instant it expires, because
`slots_taken` only counts reservations where `reserved_until > now()`, and `claim_slot` only
counts rows that actually hold a slot number. Stripe enforces the same window from its side —
the Checkout session carries `expires_at` set to the same 30 minutes — so an abandoned
checkout cannot come back and claim a slot late.

`/api/cron/release-slots` still exists to delete the dead reservation rows, but nothing calls
it on a schedule. It is housekeeping: hit it by hand if the entries table gets untidy, or
leave the rows alone.

## Voting integrity

- One vote per visitor per entry, enforced by a unique index on
  `(entry_id, voter_fingerprint)`. There is no unvoting.
- Fingerprint is a UUID in a first-party cookie (1 year), issued by middleware on the first
  request so it exists before the feed renders.
- Secondary check is SHA-256 of the client IP plus `FINGERPRINT_SALT`. The raw IP is never
  stored.
- Rate limits are 25 votes/hour per fingerprint and 100/hour per IP hash, counted in Postgres
  rather than process memory so they hold across serverless instances. Beyond that: 429.
- Rank is driven only by votes cast on this site. No external view counts, follower counts,
  or platform metrics — those would sort companies by the audience they already had.
- Ties break on earliest `submitted_at`, so ordering is stable.

`entries.vote_count`, `click_count` and `view_count` are maintained by insert triggers, so
the leaderboard never runs a count query.

## Security

- `entries` is publicly readable only where `status = 'approved'`. No public writes on any
  table except inserts into `votes`, `clicks` and `views`.
- Every write touching `entries` goes through a server route on the service role key.
- Storage buckets are public-read, no public write. Uploads use signed URLs minted by
  `/api/upload/sign`, which refuses any entry that is not paid.
- `claim_slot` and `release_expired_reservations` have execute revoked from `anon` and
  `authenticated`.

## Known gaps

- **Video compression is not implemented.** The 50 MB ceiling and the portrait check are
  enforced client-side before the upload starts and again server-side when the URL is signed,
  but an oversized file is rejected rather than transcoded. In-browser transcoding means
  shipping ffmpeg.wasm (tens of MB) plus cross-origin isolation headers; a server-side
  transcode queue is the better shape if this becomes a real problem.
- **Email delivery is Resend-or-log.** Without `RESEND_API_KEY` the upload link is written to
  the server log. `/admin` can regenerate and copy the link for any entry, so nobody is ever
  stuck.
- **Captions.** Every player carries a `<track kind="captions">` element, but there is no
  upload path for caption files yet.
