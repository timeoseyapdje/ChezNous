-- AkwaOne — comptes de paiement Stripe : moyens de paiement enregistrés (acheteurs) et versements (vendeurs).
-- À exécuter après 0010_passkeys.sql dans l'éditeur SQL Supabase.
-- Aucune donnée de carte ni coordonnée bancaire n'est stockée ici : elles restent chez Stripe.
-- On ne garde que les identifiants Stripe du client (cus_…) et du compte de versement (acct_…).

create table if not exists public.payment_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_account_id text unique,
  updated_at timestamptz not null default now()
);

alter table public.payment_accounts enable row level security;

drop policy if exists "Users read their payment account" on public.payment_accounts;
create policy "Users read their payment account" on public.payment_accounts
  for select using (auth.uid() = user_id);
-- Pas de politique insert/update/delete : seul le serveur (api/payments.js, clé service_role) écrit.
