-- Chez Nous — commandes enregistrées par le serveur après paiement Stripe.
-- À exécuter après 0002_auth_roles.sql. Les annonces de démo n'ont pas encore de compte vendeur :
-- le vendeur est donc gardé par son nom en attendant la migration des annonces.

alter table public.orders alter column seller_id drop not null;

alter table public.orders
  add column if not exists order_number bigint generated always as identity,
  add column if not exists seller_name text,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists slot text,
  add column if not exists details text,
  add column if not exists subtotal_cad numeric(10,2),
  add column if not exists fees_cad numeric(10,2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists release_code text,
  add column if not exists escrow_status text not null default 'retenu',
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table public.orders drop constraint if exists orders_escrow_status_check;
alter table public.orders add constraint orders_escrow_status_check
  check (escrow_status in ('retenu', 'libéré', 'litige', 'remboursé'));

create unique index if not exists orders_order_number_key on public.orders (order_number);
-- Le webhook et la page de retour peuvent enregistrer la même session : une seule commande par vendeur et par session.
create unique index if not exists orders_session_seller_key on public.orders (stripe_session_id, seller_name);
create index if not exists orders_buyer_id_idx on public.orders (buyer_id, created_at desc);

-- La politique de 0001 interrogeait la table sellers ; seller_id suffit et évite une sous-requête par ligne.
drop policy if exists "Orders are viewable by buyer or seller" on public.orders;
create policy "Orders are viewable by buyer or seller" on public.orders
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Aucune politique insert/update/delete : seules les fonctions serveur (clé service_role) écrivent les commandes.
grant select on public.orders to authenticated;
