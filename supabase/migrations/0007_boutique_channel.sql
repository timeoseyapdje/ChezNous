-- Chez Nous — deux espaces : la boutique (produits de Chez Nous) et la marketplace (vendeurs indépendants).
-- À exécuter après 0006_listings.sql dans l'éditeur SQL Supabase.

alter table public.listings add column if not exists channel text not null default 'marketplace';
alter table public.listings drop constraint if exists listings_channel_check;
alter table public.listings add constraint listings_channel_check check (channel in ('marketplace', 'boutique'));
create index if not exists listings_channel_idx on public.listings (channel, active, created_at desc);

-- Seul un administrateur publie ou modifie un produit de la boutique : un vendeur reste cantonné à la marketplace.
drop policy if exists "Sellers create their listings" on public.listings;
create policy "Sellers create their listings" on public.listings
  for insert to authenticated
  with check (seller_id = auth.uid() and public.is_seller() and (channel = 'marketplace' or public.is_admin()));

drop policy if exists "Sellers update their listings" on public.listings;
create policy "Sellers update their listings" on public.listings
  for update to authenticated
  using (seller_id = auth.uid() or public.is_admin())
  with check ((seller_id = auth.uid() or public.is_admin()) and (channel = 'marketplace' or public.is_admin()));
