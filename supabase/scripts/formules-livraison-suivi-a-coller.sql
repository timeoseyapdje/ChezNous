-- AkwaOne — À COLLER dans l'éditeur SQL Supabase : migration 0016 (mise en avant Pro, carrousel Premium, frais de livraison, codes promo, suivi de colis).
-- À exécuter après messagerie-securite-a-coller.sql (migration 0015).

-- AkwaOne — formules publiques (mise en avant Pro, carrousel Premium), suivi de colis, frais de livraison, codes promo.
-- À exécuter après 0015_messaging_safety.sql dans l'éditeur SQL Supabase. Rejouable.

-- ===== Formule publique des vendeurs =====
-- La table seller_plans reste privée (identifiants Stripe) ; on n'expose que « tel vendeur est Pro / Premium ».
create or replace function public.public_seller_plans()
returns table (seller_id uuid, plan text)
language sql
stable
security definer set search_path = public
as $$
  select sp.seller_id, sp.plan::text
  from public.seller_plans sp
  join public.profiles p on p.id = sp.seller_id
  where sp.status = 'active' and sp.plan in ('pro', 'premium') and coalesce(p.seller_status, 'active') = 'active'
  union
  -- La Boutique AkwaOne est traitée comme Premium (mise en avant de ses produits).
  select o.seller_id, 'premium' from public.official_shops o;
$$;
revoke all on function public.public_seller_plans() from public;
grant execute on function public.public_seller_plans() to anon, authenticated;

-- ===== Frais de livraison par annonce =====
-- Le vendeur indique ses frais d'expédition ; au panier, on applique une fois par vendeur le montant le plus élevé de ses articles.
alter table public.listings add column if not exists shipping_cad numeric(10,2) not null default 0;
alter table public.listings drop constraint if exists listings_shipping_range;
alter table public.listings add constraint listings_shipping_range check (shipping_cad >= 0 and shipping_cad <= 500);

-- ===== Commandes : livraison, réduction, suivi du colis =====
alter table public.orders add column if not exists shipping_cad numeric(10,2) not null default 0;
alter table public.orders add column if not exists discount_cad numeric(10,2) not null default 0;  -- code promo (payé par AkwaOne)
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_carrier text;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders drop constraint if exists orders_tracking_length;
alter table public.orders add constraint orders_tracking_length check (
  (tracking_number is null or char_length(tracking_number) <= 60) and (tracking_carrier is null or char_length(tracking_carrier) <= 40)
);

grant select (id, order_number, buyer_id, seller_id, seller_name, listing_id, items, slot, details, subtotal_cad, fees_cad,
  amount_cad, status, escrow_status, payment_method, stripe_session_id, paid_at, cancelled_at, created_at,
  channel, slot_at, payout_status, payout_amount_cad,
  shipping_cad, discount_cad, tracking_number, tracking_carrier, shipped_at)
  on public.orders to authenticated;
