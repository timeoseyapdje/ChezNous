-- Chez Nous — abonnements vendeur (formules Pro et Premium) payés par Stripe.
-- À exécuter après 0004_messaging.sql.

-- Table séparée de profiles : un propriétaire peut modifier son profil, il ne doit jamais pouvoir s'attribuer une formule.
create table if not exists public.seller_plans (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  plan seller_plan not null,
  shop_name text,
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_session_id text unique,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.seller_plans enable row level security;

drop policy if exists "Sellers read their own plan" on public.seller_plans;
create policy "Sellers read their own plan" on public.seller_plans
  for select using (auth.uid() = seller_id);

drop policy if exists "Admins read all plans" on public.seller_plans;
create policy "Admins read all plans" on public.seller_plans
  for select using (public.is_admin());
-- Pas de politique insert/update/delete : seul le serveur (clé service_role) écrit, après vérification du paiement Stripe.
