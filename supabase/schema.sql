-- Meeple Society — Supabase schema
-- Run this in the Supabase SQL editor for BOTH the prod and dev projects.

-- ============ GAMES ============
create table games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bgg_id integer,
  image_url text,
  description text,
  year_published integer,
  created_at timestamptz default now()
);

-- ============ RANKINGS ============
create table rankings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  published boolean default false,
  created_at timestamptz default now()
);

create table ranking_items (
  id uuid primary key default gen_random_uuid(),
  ranking_id uuid references rankings(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  rank integer not null,
  blurb text
);

-- ============ POSTS ============
create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  body text,
  type text check (type in ('video','podcast','article')) default 'article',
  thumbnail_url text,
  published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- ============ VIDEOS (YouTube sync target) ============
create table videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text unique not null,
  title text not null,
  thumbnail_url text,
  published_at timestamptz,
  post_id uuid references posts(id)
);

-- ============ PODCAST EPISODES (RSS sync target) ============
create table podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  guid text unique not null,
  title text not null,
  audio_url text,
  description text,
  published_at timestamptz
);

-- ============ PLAYS (game tracker) ============
create table plays (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id),
  played_at date not null,
  players text[],
  notes text,
  source text check (source in ('manual','bgg')) default 'manual',
  created_at timestamptz default now()
);

-- ============ PLACES + REVIEWS ============
create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('store','cafe')) not null,
  address text,
  lat double precision,
  lng double precision,
  description text
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  body text,
  author text,
  published_at timestamptz default now()
);

-- ============ SOCIAL LINKS ============
create table social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  icon text
);

-- ============ ROW LEVEL SECURITY ============
-- Public can read published content; only authenticated admins can write.
-- This assumes a single-admin setup to start — every logged-in Supabase
-- Auth user is treated as an admin. Tighten with a role check later if
-- you add more accounts that shouldn't have write access.

alter table games enable row level security;
alter table rankings enable row level security;
alter table ranking_items enable row level security;
alter table posts enable row level security;
alter table videos enable row level security;
alter table podcast_episodes enable row level security;
alter table plays enable row level security;
alter table places enable row level security;
alter table reviews enable row level security;
alter table social_links enable row level security;

-- Public read policies
create policy "public read games" on games for select using (true);
create policy "public read published rankings" on rankings for select using (published = true);
create policy "public read ranking_items" on ranking_items for select using (true);
create policy "public read published posts" on posts for select using (published = true);
create policy "public read videos" on videos for select using (true);
create policy "public read episodes" on podcast_episodes for select using (true);
create policy "public read plays" on plays for select using (true);
create policy "public read places" on places for select using (true);
create policy "public read reviews" on reviews for select using (true);
create policy "public read social_links" on social_links for select using (true);

-- Admin (any authenticated user) write policies
create policy "admin write games" on games for all using (auth.role() = 'authenticated');
create policy "admin write rankings" on rankings for all using (auth.role() = 'authenticated');
create policy "admin write ranking_items" on ranking_items for all using (auth.role() = 'authenticated');
create policy "admin write posts" on posts for all using (auth.role() = 'authenticated');
create policy "admin write videos" on videos for all using (auth.role() = 'authenticated');
create policy "admin write episodes" on podcast_episodes for all using (auth.role() = 'authenticated');
create policy "admin write plays" on plays for all using (auth.role() = 'authenticated');
create policy "admin write places" on places for all using (auth.role() = 'authenticated');
create policy "admin write reviews" on reviews for all using (auth.role() = 'authenticated');
create policy "admin write social_links" on social_links for all using (auth.role() = 'authenticated');
