-- AkwaOne — avis réels, consentements de notification, versements aux vendeurs, commandes de la Boutique, rappels de réservation.
-- À exécuter après 0013_admin.sql dans l'éditeur SQL Supabase. Rejouable.

-- ===== Consentements de notification (cahier 3.6, 3.10, règle 8) =====
alter table public.profiles add column if not exists notify_email boolean not null default true;
alter table public.profiles add column if not exists notify_sms boolean not null default false;
alter table public.profiles add column if not exists phone text;
alter table public.profiles drop constraint if exists profiles_phone_length;
alter table public.profiles add constraint profiles_phone_length check (phone is null or char_length(phone) <= 30);

-- L'inscription enregistre les cases cochées (courriel, SMS) ; le rôle reste toujours « buyer ».
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, role, notify_email, notify_sms, phone)
  values (
    new.id,
    nullif(trim(meta->>'full_name'), ''),
    'buyer',
    coalesce((meta->>'notify_email')::boolean, true),
    coalesce((meta->>'notify_sms')::boolean, false),
    nullif(left(trim(coalesce(meta->>'phone', '')), 30), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ===== Commandes : canal, créneau, rappel, versement au vendeur =====
alter table public.orders add column if not exists channel text not null default 'marketplace';
alter table public.orders drop constraint if exists orders_channel_check;
alter table public.orders add constraint orders_channel_check check (channel in ('marketplace', 'boutique'));
alter table public.orders add column if not exists slot_at timestamptz;            -- date réelle du créneau réservé
alter table public.orders add column if not exists reminder_sent_at timestamptz;   -- rappel 24 h envoyé
alter table public.orders add column if not exists payout_status text not null default 'none';
alter table public.orders drop constraint if exists orders_payout_status_check;
alter table public.orders add constraint orders_payout_status_check
  check (payout_status in ('none', 'pending', 'paid', 'failed', 'platform'));
  -- none : pas encore libéré • pending : en attente du compte bancaire du vendeur • paid : virement Stripe fait
  -- failed : virement refusé (réessayé chaque jour) • platform : vente de la Boutique AkwaOne, l'argent reste à AkwaOne
alter table public.orders add column if not exists payout_amount_cad numeric(10,2);
alter table public.orders add column if not exists payout_transfer_id text;
alter table public.orders add column if not exists payout_error text;
create index if not exists orders_payout_pending_idx on public.orders (payout_status) where payout_status in ('pending', 'failed');
create index if not exists orders_slot_reminder_idx on public.orders (slot_at) where reminder_sent_at is null;

-- Nouvelles colonnes lisibles par l'acheteur et le vendeur (le code de réception reste illisible).
grant select (id, order_number, buyer_id, seller_id, seller_name, listing_id, items, slot, details, subtotal_cad, fees_cad,
  amount_cad, status, escrow_status, payment_method, stripe_session_id, paid_at, cancelled_at, created_at,
  channel, slot_at, payout_status, payout_amount_cad)
  on public.orders to authenticated;

-- Les commandes déjà passées auprès de la Boutique AkwaOne sont rattachées au canal boutique.
update public.orders o set channel = 'boutique'
where channel <> 'boutique' and exists (select 1 from public.official_shops s where s.seller_id = o.seller_id);

-- ===== Avis vérifiés (cahier 3.11) : un avis par commande terminée, écrit par le serveur =====
alter table public.reviews add column if not exists order_number bigint;
alter table public.reviews add column if not exists buyer_id uuid references public.profiles(id) on delete set null;
alter table public.reviews add column if not exists seller_id uuid references public.profiles(id) on delete set null;
alter table public.reviews add column if not exists listing_id uuid references public.listings(id) on delete set null;
alter table public.reviews add column if not exists author_name text;
alter table public.reviews alter column approved set default true;
create unique index if not exists reviews_one_per_order on public.reviews (order_number);
create index if not exists reviews_listing_idx on public.reviews (listing_id, created_at desc);
create index if not exists reviews_seller_idx on public.reviews (seller_id, created_at desc);
alter table public.reviews drop constraint if exists reviews_comment_length;
alter table public.reviews add constraint reviews_comment_length check (comment is null or char_length(comment) <= 600);

drop policy if exists "Approved reviews are public" on public.reviews;
create policy "Approved reviews are public" on public.reviews
  for select using (approved or auth.uid() = buyer_id or public.is_admin());
-- Pas de politique d'écriture : l'avis passe par api/moderation.js, qui vérifie que la commande est payée et terminée.
revoke select on public.reviews from anon, authenticated;
grant select (id, rating, comment, author_name, listing_id, seller_id, order_number, created_at, approved) on public.reviews to anon, authenticated;

-- Notes affichées sur le site : moyenne et nombre d'avis réels, par annonce et par vendeur.
create or replace view public.listing_ratings as
  select listing_id, round(avg(rating)::numeric, 1) as rating, count(*)::int as reviews
  from public.reviews where approved and listing_id is not null group by listing_id;
create or replace view public.seller_ratings as
  select seller_id, round(avg(rating)::numeric, 1) as rating, count(*)::int as reviews
  from public.reviews where approved and seller_id is not null group by seller_id;
grant select on public.listing_ratings, public.seller_ratings to anon, authenticated;
