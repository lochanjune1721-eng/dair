-- ============================================================================
-- DAIR — schema, triggers, RLS, storage.
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- tables ---

create table if not exists public.seasons (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  dare_text         text not null,
  dare_description  text,
  starts_at         timestamptz not null default now(),
  ends_at           timestamptz,
  is_active         boolean not null default false,
  total_slots       int not null default 25,
  created_at        timestamptz not null default now()
);

-- Only one season may be active at a time.
create unique index if not exists seasons_one_active
  on public.seasons ((is_active)) where is_active;

create table if not exists public.entries (
  id                    uuid primary key default gen_random_uuid(),
  season_id             uuid not null references public.seasons(id) on delete cascade,
  slug                  text unique not null,
  company_name          text not null,
  company_url           text,
  product_tagline       text check (char_length(product_tagline) <= 100),
  logo_path             text,
  video_path            text,
  video_duration        int,
  slot_number           int,
  status                text not null default 'reserved'
                        check (status in ('reserved','paid','submitted','approved','rejected')),
  contact_email         text not null,
  stripe_session_id     text,
  stripe_payment_intent text,
  vote_count            int not null default 0,
  click_count           int not null default 0,
  view_count            int not null default 0,
  created_at            timestamptz not null default now(),
  submitted_at          timestamptz,
  reserved_until        timestamptz
);

-- A slot number is claimed by exactly one entry per season.
create unique index if not exists entries_season_slot
  on public.entries (season_id, slot_number) where slot_number is not null;
create index if not exists entries_season_status on public.entries (season_id, status);
-- Leaderboard order: votes desc, then earliest submission. Ties stay stable.
create index if not exists entries_rank on public.entries (vote_count desc, submitted_at asc);
create index if not exists entries_reserved_until on public.entries (reserved_until)
  where status = 'reserved';

create table if not exists public.votes (
  id                 uuid primary key default gen_random_uuid(),
  entry_id           uuid not null references public.entries(id) on delete cascade,
  voter_fingerprint  text not null,
  ip_hash            text,
  created_at         timestamptz not null default now(),
  unique (entry_id, voter_fingerprint)
);

create index if not exists votes_fingerprint_time on public.votes (voter_fingerprint, created_at desc);
create index if not exists votes_ip_time on public.votes (ip_hash, created_at desc);

create table if not exists public.clicks (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  referrer   text
);

create table if not exists public.views (
  id                uuid primary key default gen_random_uuid(),
  entry_id          uuid not null references public.entries(id) on delete cascade,
  voter_fingerprint text,
  created_at        timestamptz not null default now()
);

create index if not exists views_entry_fingerprint on public.views (entry_id, voter_fingerprint);

-- -------------------------------------------------------------- triggers ---
-- Counters are maintained by triggers so the leaderboard never counts rows.

create or replace function public.bump_vote_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.entries set vote_count = vote_count + 1 where id = new.entry_id;
  return new;
end;
$$;

drop trigger if exists votes_bump on public.votes;
create trigger votes_bump after insert on public.votes
  for each row execute function public.bump_vote_count();

create or replace function public.bump_click_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.entries set click_count = click_count + 1 where id = new.entry_id;
  return new;
end;
$$;

drop trigger if exists clicks_bump on public.clicks;
create trigger clicks_bump after insert on public.clicks
  for each row execute function public.bump_click_count();

create or replace function public.bump_view_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.entries set view_count = view_count + 1 where id = new.entry_id;
  return new;
end;
$$;

drop trigger if exists views_bump on public.views;
create trigger views_bump after insert on public.views
  for each row execute function public.bump_view_count();

-- ------------------------------------------------------------ slot claim ---
-- Called from the Stripe webhook with the service role. Locks the season's
-- entries so two simultaneous payments cannot both claim slot 25.

create or replace function public.claim_slot(
  p_entry_id       uuid,
  p_session_id     text,
  p_payment_intent text
) returns public.entries
language plpgsql security definer set search_path = public as $$
declare
  v_entry   public.entries;
  v_season  public.seasons;
  v_taken   int;
  v_next    int;
begin
  select * into v_entry from public.entries where id = p_entry_id for update;
  if not found then
    raise exception 'entry % not found', p_entry_id;
  end if;

  -- Already claimed: idempotent, webhooks retry.
  if v_entry.slot_number is not null then
    return v_entry;
  end if;

  select * into v_season from public.seasons where id = v_entry.season_id for update;

  -- Lock every slot-holding row in the season before counting.
  perform 1 from public.entries
    where season_id = v_entry.season_id and slot_number is not null
    for update;

  select count(*), coalesce(max(slot_number), 0)
    into v_taken, v_next
    from public.entries
   where season_id = v_entry.season_id and slot_number is not null;

  if v_taken >= v_season.total_slots then
    raise exception 'season % is full', v_entry.season_id using errcode = 'P0001';
  end if;

  update public.entries
     set slot_number           = v_next + 1,
         status                = case when status in ('submitted','approved') then status else 'paid' end,
         stripe_session_id     = coalesce(p_session_id, stripe_session_id),
         stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent),
         reserved_until        = null
   where id = p_entry_id
   returning * into v_entry;

  return v_entry;
end;
$$;

-- Slots taken = every slot-holding entry, plus live reservations.
-- Rejected entries keep their slot: it was paid for, and disqualification is
-- not a refund. This must agree with claim_slot's count or /apply will sell a
-- slot the webhook then has to refuse.
create or replace function public.slots_taken(p_season_id uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.entries
   where season_id = p_season_id
     and (slot_number is not null
          or (status = 'reserved' and reserved_until > now()));
$$;

-- Vacuum expired reservations. Called by the cron route every 5 minutes.
create or replace function public.release_expired_reservations() returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with gone as (
    delete from public.entries
     where status = 'reserved'
       and slot_number is null
       and reserved_until is not null
       and reserved_until < now()
    returning 1
  )
  select count(*)::int into v_count from gone;
  return v_count;
end;
$$;

-- ------------------------------------------------------------------ RLS ---

alter table public.seasons enable row level security;
alter table public.entries enable row level security;
alter table public.votes   enable row level security;
alter table public.clicks  enable row level security;
alter table public.views   enable row level security;

-- seasons: public read only.
drop policy if exists seasons_public_select on public.seasons;
create policy seasons_public_select on public.seasons
  for select to anon, authenticated using (true);

-- entries: public read of approved rows only. No public writes at all —
-- every write goes through a server route on the service role key.
drop policy if exists entries_public_select on public.entries;
create policy entries_public_select on public.entries
  for select to anon, authenticated using (status = 'approved');

-- votes: insert only, never readable.
drop policy if exists votes_public_insert on public.votes;
create policy votes_public_insert on public.votes
  for insert to anon, authenticated with check (true);

-- clicks / views: insert only.
drop policy if exists clicks_public_insert on public.clicks;
create policy clicks_public_insert on public.clicks
  for insert to anon, authenticated with check (true);

drop policy if exists views_public_insert on public.views;
create policy views_public_insert on public.views
  for insert to anon, authenticated with check (true);

-- Nobody but the service role may execute the privileged functions.
revoke all on function public.claim_slot(uuid, text, text) from public, anon, authenticated;
revoke all on function public.release_expired_reservations() from public, anon, authenticated;
grant execute on function public.slots_taken(uuid) to anon, authenticated;

-- -------------------------------------------------------------- realtime ---
-- /leaderboard subscribes to entries. Only approved rows pass RLS.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'entries'
  ) then
    alter publication supabase_realtime add table public.entries;
  end if;
end $$;

alter table public.entries replica identity full;

-- --------------------------------------------------------------- storage ---
-- Two buckets, public read, no public write. Uploads use signed URLs minted
-- by a server route only after the entry is confirmed paid.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800,
        array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do update
  set public = true,
      file_size_limit = 52428800,
      allowed_mime_types = array['video/mp4','video/quicktime','video/webm'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152,
        array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml'];

drop policy if exists "public read videos" on storage.objects;
create policy "public read videos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'videos');

drop policy if exists "public read logos" on storage.objects;
create policy "public read logos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'logos');

-- No insert/update/delete policies: writes require the service role, which
-- bypasses RLS. Signed upload URLs are minted server-side.

-- ------------------------------------------------------------------ seed ---

insert into public.seasons (name, dare_text, dare_description, is_active, total_slots)
select
  'Season One',
  'Cold call your own support line and file a complaint about yourself.',
  E'Every entrant calls their own customer support line as a member of the public and files a genuine complaint about their own product. The call must be recorded end to end.\n\nRules\n1. One vertical video per entry. 9:16. Under 50 MB.\n2. The complaint must be real and specific. No invented product, no invented fault.\n3. The entrant must not identify themselves to the agent during the call.\n4. The product being promoted must appear in the video.\n5. No paid promotion of the entry off-site. Votes are cast here or not at all.\n\nDisqualification\nStaged calls, actors, undisclosed edits that change the outcome of the call, vote manipulation of any kind, or a video that is not the entrant''s own company.',
  true,
  25
where not exists (select 1 from public.seasons);
