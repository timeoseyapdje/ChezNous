-- Chez Nous — annonces publiées par les vendeurs, lues par la marketplace et par le serveur de paiement.
-- À exécuter après 0005_seller_plans.sql.

-- La table sellers de 0001 n'est jamais remplie : une annonce et une commande pointent directement vers le profil du vendeur.
alter table public.listings drop constraint if exists listings_seller_id_fkey;
alter table public.listings add constraint listings_seller_id_fkey
  foreign key (seller_id) references public.profiles(id) on delete cascade;
alter table public.orders drop constraint if exists orders_seller_id_fkey;
alter table public.orders add constraint orders_seller_id_fkey
  foreign key (seller_id) references public.profiles(id);

alter table public.listings
  add column if not exists seller_name text not null default '',
  add column if not exists city text not null default 'Toronto',
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.listings drop constraint if exists listings_name_length;
alter table public.listings add constraint listings_name_length check (char_length(trim(name)) between 1 and 120);
alter table public.listings drop constraint if exists listings_seller_name_length;
alter table public.listings add constraint listings_seller_name_length check (char_length(trim(seller_name)) between 1 and 80);
alter table public.listings drop constraint if exists listings_description_length;
alter table public.listings add constraint listings_description_length check (description is null or char_length(description) <= 2000);
alter table public.listings drop constraint if exists listings_price_range;
alter table public.listings add constraint listings_price_range check (price_cad > 0 and price_cad <= 100000);
-- Image en https uniquement : une adresse http serait bloquée par le navigateur sur un site https.
alter table public.listings drop constraint if exists listings_cover_https;
alter table public.listings add constraint listings_cover_https check (cover_url is null or cover_url ~ '^https://');

create index if not exists listings_active_idx on public.listings (active, created_at desc);
create index if not exists listings_seller_idx on public.listings (seller_id);
create index if not exists orders_seller_id_idx on public.orders (seller_id, created_at desc);

create or replace function public.is_seller()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('seller', 'admin'));
$$;
revoke all on function public.is_seller() from public, anon;
grant execute on function public.is_seller() to authenticated;

-- Lecture : tout le monde voit les annonces actives ; un vendeur voit aussi ses annonces retirées.
drop policy if exists "Listings are public" on public.listings;
drop policy if exists "Active listings are public" on public.listings;
create policy "Active listings are public" on public.listings
  for select using (active or auth.uid() = seller_id or public.is_admin());

-- Écriture : un vendeur ne publie, modifie ou supprime que ses propres annonces ; un admin peut tout retirer.
drop policy if exists "Sellers create their listings" on public.listings;
create policy "Sellers create their listings" on public.listings
  for insert to authenticated
  with check (seller_id = auth.uid() and public.is_seller());

drop policy if exists "Sellers update their listings" on public.listings;
create policy "Sellers update their listings" on public.listings
  for update to authenticated
  using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists "Sellers delete their listings" on public.listings;
create policy "Sellers delete their listings" on public.listings
  for delete to authenticated
  using (seller_id = auth.uid() or public.is_admin());

-- Essais de code de réception refusés : au-delà de 5, le serveur bloque la commande (voir api/release-order.js).
alter table public.orders add column if not exists release_attempts integer not null default 0;

-- Le vendeur lit ses commandes mais jamais le code de réception : sinon il libérerait le séquestre sans le client.
revoke select on public.orders from anon, authenticated;
grant select (id, order_number, buyer_id, seller_id, seller_name, listing_id, items, slot, details, subtotal_cad, fees_cad,
  amount_cad, status, escrow_status, payment_method, stripe_session_id, paid_at, cancelled_at, created_at)
  on public.orders to authenticated;

create or replace function public.my_release_codes()
returns table (order_number bigint, release_code text)
language sql
stable
security definer set search_path = public
as $$
  select o.order_number, o.release_code from public.orders o where o.buyer_id = auth.uid();
$$;
revoke all on function public.my_release_codes() from public, anon;
grant execute on function public.my_release_codes() to authenticated;

-- Un vendeur ne peut ni transférer une annonce à un autre compte ni antidater sa création.
create or replace function public.protect_listing_owner()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.seller_id := old.seller_id;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists listings_protect_owner on public.listings;
create trigger listings_protect_owner
  before insert or update on public.listings
  for each row execute function public.protect_listing_owner();
