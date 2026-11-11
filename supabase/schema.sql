-- Finanzas personales: tablas + seguridad por usuario.
-- Pegá todo esto en Supabase → SQL Editor → Run.
-- Se puede volver a ejecutar sin perder datos: solo crea lo que falte.

create table if not exists public.cuentas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tipo text not null check (tipo in ('ahorro', 'actual')),
  nombre text not null,
  moneda text not null default 'ARS' check (moneda in ('ARS', 'USD', 'EUR')),
  monto numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fecha date not null,
  descripcion text not null default '',
  categoria text not null,
  monto numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists gastos_user_fecha on public.gastos (user_id, fecha);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  fija boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ingresos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  descripcion text not null,
  monto numeric not null,
  moneda text not null default 'ARS' check (moneda in ('ARS', 'USD', 'EUR')),
  recurrente boolean not null default true,
  dia int check (dia between 1 and 31),
  fecha date,
  created_at timestamptz not null default now()
);

-- Para bases creadas antes de que los cobros tuvieran moneda.
alter table public.ingresos
  add column if not exists moneda text not null default 'ARS' check (moneda in ('ARS', 'USD', 'EUR'));

create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  costo numeric not null,
  moneda text not null default 'ARS' check (moneda in ('ARS', 'USD', 'EUR')),
  fecha date not null,
  pct_ahorros numeric not null default 30,
  created_at timestamptz not null default now()
);

create table if not exists public.deseos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  donde text,
  precio numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.ajustes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users on delete cascade,
  usd numeric not null default 0,
  eur numeric not null default 0,
  inflacion numeric not null default 0,
  pct_ahorros numeric not null default 30,
  created_at timestamptz not null default now()
);

-- Cada usuario ve y modifica solamente sus propias filas.
do $$
declare t text;
begin
  foreach t in array array['cuentas', 'gastos', 'categorias', 'ingresos', 'metas', 'deseos', 'ajustes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "solo el dueño" on public.%I', t);
    execute format(
      'create policy "solo el dueño" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
