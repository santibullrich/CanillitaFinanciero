-- CanillitaFinanciero: esquema de base de datos.
-- Pegalo entero en Supabase → SQL Editor → Run.

create extension if not exists pgcrypto;

-- Lista de seguimiento: una fila por usuario y activo.
create table if not exists public.watchlist (
  user_id    uuid not null references auth.users(id) on delete cascade,
  symbol     text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

-- Posiciones: lo que cada usuario compró.
create table if not exists public.positions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  symbol     text not null,
  name       text,
  currency   text not null default 'USD',
  quantity   numeric not null check (quantity > 0),
  buy_price  numeric not null check (buy_price > 0),
  bought_at  date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists positions_user_idx on public.positions (user_id);

-- Explicaciones de "¿por qué se movió?" generadas con IA, una por activo y por día.
create table if not exists public.ai_explanations (
  symbol     text not null,
  day        date not null,
  body       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (symbol, day)
);

-- Registro de consultas al asesor, para limitar abusos.
create table if not exists public.advisor_runs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists advisor_runs_user_idx on public.advisor_runs (user_id, created_at desc);

-- Seguridad por fila: cada usuario ve y toca solo lo suyo.
alter table public.watchlist       enable row level security;
alter table public.positions       enable row level security;
alter table public.ai_explanations enable row level security;
alter table public.advisor_runs    enable row level security;

drop policy if exists "watchlist propia" on public.watchlist;
create policy "watchlist propia" on public.watchlist
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "posiciones propias" on public.positions;
create policy "posiciones propias" on public.positions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Las explicaciones son públicas para leer; solo el servidor (service role) las escribe.
drop policy if exists "explicaciones visibles" on public.ai_explanations;
create policy "explicaciones visibles" on public.ai_explanations
  for select to anon, authenticated using (true);

drop policy if exists "consultas propias" on public.advisor_runs;
create policy "consultas propias" on public.advisor_runs
  for select to authenticated using (auth.uid() = user_id);
