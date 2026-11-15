-- AkwaOne — boutique officielle : un compte vendeur (pas administrateur) dont les annonces vont dans la Boutique AkwaOne.
-- À exécuter après 0007_boutique_channel.sql dans l'éditeur SQL Supabase.

-- Table séparée de profiles : un vendeur peut modifier son profil, il ne doit jamais pouvoir se déclarer boutique officielle.
create table if not exists public.official_shops (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.official_shops enable row level security;

drop policy if exists "Official shop reads its own row" on public.official_shops;
create policy "Official shop reads its own row" on public.official_shops
  for select using (auth.uid() = seller_id or public.is_admin());
-- Pas de politique insert/update/delete : seul l'éditeur SQL (ou la clé service_role) désigne la boutique officielle.

create or replace function public.is_official_shop()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.official_shops where seller_id = auth.uid());
$$;
revoke all on function public.is_official_shop() from public, anon;
grant execute on function public.is_official_shop() to authenticated;

-- Canal imposé par le compte : la boutique officielle publie uniquement dans la Boutique,
-- les autres vendeurs uniquement dans la marketplace. Un administrateur garde les deux.
drop policy if exists "Sellers create their listings" on public.listings;
create policy "Sellers create their listings" on public.listings
  for insert to authenticated
  with check (
    seller_id = auth.uid() and public.is_seller()
    and (public.is_admin() or (channel = 'boutique') = public.is_official_shop())
  );

drop policy if exists "Sellers update their listings" on public.listings;
create policy "Sellers update their listings" on public.listings
  for update to authenticated
  using (seller_id = auth.uid() or public.is_admin())
  with check (
    (seller_id = auth.uid() or public.is_admin())
    and (public.is_admin() or (channel = 'boutique') = public.is_official_shop())
  );
