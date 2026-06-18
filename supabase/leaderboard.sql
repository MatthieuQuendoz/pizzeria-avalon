-- ============================================
-- Pizzeria Avalon — Leaderboard "L'Acchiappa Pizze"
-- Esegui questo script nel SQL Editor di Supabase.
-- Poi copia Project URL e anon key in gioca.html
-- (window.AVALON_SUPABASE_URL / window.AVALON_SUPABASE_ANON_KEY).
-- ============================================

create table if not exists public.leaderboard (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 20),
  score       integer not null check (score >= 0 and score <= 10000),
  created_at  timestamptz not null default now()
);

-- Indice per ordinare velocemente i punteggi piu alti
create index if not exists leaderboard_score_idx
  on public.leaderboard (score desc);

-- Row Level Security: lettura pubblica + inserimento pubblico controllato.
alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard_public_select" on public.leaderboard;
create policy "leaderboard_public_select"
  on public.leaderboard
  for select
  using (true);

drop policy if exists "leaderboard_public_insert" on public.leaderboard;
create policy "leaderboard_public_insert"
  on public.leaderboard
  for insert
  with check (
    char_length(name) between 1 and 20
    and score >= 0
    and score <= 10000
  );

-- Nota sicurezza: con la sola anon key chiunque puo inviare un punteggio.
-- I check qui sopra limitano valori assurdi. Per impedire del tutto i punteggi
-- falsi servirebbe una validazione lato server (Edge Function); per un gioco
-- promozionale i vincoli attuali sono in genere sufficienti.
