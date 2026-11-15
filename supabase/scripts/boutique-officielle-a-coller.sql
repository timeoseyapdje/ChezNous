-- AkwaOne — À COLLER EN UNE FOIS dans l'éditeur SQL Supabase : migrations 0008 à 0012, puis script du compte boutique.
-- Tout est rejouable sans risque. Le compte boutique@akwaone.ca existe déjà : son mot de passe est conservé.

-- ===== Migration 0008_official_shop =====
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

-- ===== Migration 0009_listing_images =====
-- AkwaOne — photos des annonces déposées depuis le tableau de bord (Supabase Storage).
-- À exécuter après 0008_official_shop.sql dans l'éditeur SQL Supabase.

-- Bucket public en lecture (les photos s'affichent sur le site), 5 Mo maximum, images uniquement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Dépôt : un vendeur connecté écrit uniquement dans son propre dossier (<son id>/fichier.jpg).
drop policy if exists "Sellers upload listing images" on storage.objects;
create policy "Sellers upload listing images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_seller()
  );

-- Suppression : chacun ne retire que ses propres photos ; un administrateur peut tout retirer.
drop policy if exists "Sellers delete their listing images" on storage.objects;
create policy "Sellers delete their listing images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
-- Pas de politique select : les photos se lisent par leur adresse publique, sans pouvoir lister le dossier des autres.

-- ===== Migration 0010_passkeys =====
-- AkwaOne — clés d'accès (passkeys / WebAuthn) pour se connecter sans mot de passe.
-- À exécuter après 0009_listing_images.sql dans l'éditeur SQL Supabase.

create table if not exists public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,          -- identifiant de la clé (base64url)
  public_key text not null,                    -- clé publique SPKI (base64url) ; la clé privée ne quitte jamais l'appareil
  algorithm integer not null,                  -- -7 ES256, -257 RS256, -8 Ed25519
  sign_count bigint not null default 0,
  transports text[] not null default '{}',
  name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists passkeys_user_idx on public.passkeys (user_id);

alter table public.passkeys enable row level security;

-- Chacun voit et supprime ses propres clés. Ajout et connexion passent uniquement par le serveur (api/passkey.js).
drop policy if exists "Users read their passkeys" on public.passkeys;
create policy "Users read their passkeys" on public.passkeys
  for select using (auth.uid() = user_id);

drop policy if exists "Users delete their passkeys" on public.passkeys;
create policy "Users delete their passkeys" on public.passkeys
  for delete using (auth.uid() = user_id);

revoke insert, update on public.passkeys from anon, authenticated;
grant select (id, name, created_at, last_used_at, transports), delete on public.passkeys to authenticated;

-- ===== Migration 0011_payment_accounts =====
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

-- ===== Migration 0012_avatars_themes =====
-- AkwaOne — photos de profil et thèmes réservés à la formule Premium.
-- À exécuter après 0011_payment_accounts.sql dans l'éditeur SQL Supabase.

-- ===== Photos de profil =====
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or (avatar_url like 'https://%' and length(avatar_url) <= 500));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Chaque membre dépose et retire uniquement ses photos, dans son dossier (<son id>/photo.jpg).
drop policy if exists "Members upload their avatar" on storage.objects;
create policy "Members upload their avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members delete their avatar" on storage.objects;
create policy "Members delete their avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Thèmes Premium =====
-- Formule Premium active : condition pour enregistrer ou modifier un thème.
create or replace function public.has_premium()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.seller_plans
    where seller_id = auth.uid() and plan = 'premium' and status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;
revoke all on function public.has_premium() from public, anon;
grant execute on function public.has_premium() to authenticated;

create table if not exists public.premium_themes (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  site_accent text check (site_accent ~ '^#[0-9A-Fa-f]{6}$'),     -- couleur du site, pour le vendeur lui-même
  site_mode text not null default 'light' check (site_mode in ('light', 'dark')),
  shop_accent text check (shop_accent ~ '^#[0-9A-Fa-f]{6}$'),     -- couleur de ses annonces, vue par tous
  updated_at timestamptz not null default now()
);

alter table public.premium_themes enable row level security;

-- Lecture publique : les visiteurs voient la couleur des annonces des vendeurs Premium.
drop policy if exists "Premium themes are public" on public.premium_themes;
create policy "Premium themes are public" on public.premium_themes
  for select using (true);

drop policy if exists "Premium sellers create their theme" on public.premium_themes;
create policy "Premium sellers create their theme" on public.premium_themes
  for insert to authenticated
  with check (seller_id = auth.uid() and public.has_premium());

drop policy if exists "Premium sellers update their theme" on public.premium_themes;
create policy "Premium sellers update their theme" on public.premium_themes
  for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid() and public.has_premium());

drop policy if exists "Sellers delete their theme" on public.premium_themes;
create policy "Sellers delete their theme" on public.premium_themes
  for delete to authenticated
  using (seller_id = auth.uid());

-- ===== Compte boutique@akwaone.ca : vendeur + boutique officielle + Premium =====
-- AkwaOne — compte officiel de la boutique AkwaOne, avec la formule vendeur Premium offerte (sans Stripe).
-- Remplacez le mot de passe ci-dessous, puis exécutez ce script dans l'éditeur SQL Supabase.
-- À exécuter après la migration 0008_official_shop.sql.
-- Le script crée le compte s'il n'existe pas encore (adresse déjà confirmée, connexion immédiate possible),
-- le passe vendeur, le désigne boutique officielle et lui attribue la formule Premium. Il est idempotent : le relancer ne crée pas de doublon
-- et ne change pas le mot de passe d'un compte déjà créé.
-- Ne commitez jamais ce fichier avec le vrai mot de passe.

do $$
declare
  boutique_email    text := 'boutique@akwaone.ca';
  boutique_password text := 'METTRE_LE_MOT_DE_PASSE_ICI';  -- ← mot de passe du compte (12 caractères minimum)
  boutique_id uuid;
begin
  select id into boutique_id from auth.users where lower(email) = lower(boutique_email);

  if boutique_id is null then
    if boutique_password = 'METTRE_LE_MOT_DE_PASSE_ICI' or length(boutique_password) < 12 then
      raise exception 'Remplacez le mot de passe (12 caractères minimum) avant d''exécuter le script.';
    end if;

    boutique_id := gen_random_uuid();

    -- Le déclencheur on_auth_user_created crée aussitôt le profil (rôle « buyer », modifié plus bas).
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', boutique_id, 'authenticated', 'authenticated',
      boutique_email, extensions.crypt(boutique_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Boutique AkwaOne"}', now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), boutique_id, boutique_id::text,
      jsonb_build_object('sub', boutique_id::text, 'email', boutique_email, 'email_verified', true),
      'email', now(), now(), now()
    );

    raise notice 'Compte % créé.', boutique_email;
  else
    raise notice 'Compte % déjà existant : mot de passe inchangé.', boutique_email;
  end if;

  -- Filet de sécurité si le déclencheur de profil n'est pas installé.
  insert into public.profiles (id, full_name, role)
  values (boutique_id, 'Boutique AkwaOne', 'buyer')
  on conflict (id) do nothing;

  -- Vendeur, sans aucun droit d'administration (un compte passé admin par l'ancienne version du script redevient vendeur).
  update public.profiles
     set role = 'seller', full_name = coalesce(full_name, 'Boutique AkwaOne')
   where id = boutique_id;

  -- Boutique officielle : ses annonces vont dans la Boutique AkwaOne, jamais dans la marketplace.
  insert into public.official_shops (seller_id) values (boutique_id)
  on conflict (seller_id) do nothing;

  -- Formule Premium active, sans abonnement Stripe ni date de fin : elle n'expire pas et n'est jamais facturée.
  insert into public.seller_plans (seller_id, plan, shop_name, status, stripe_customer_id, stripe_subscription_id, stripe_session_id, current_period_end, updated_at)
  values (boutique_id, 'premium', 'Boutique AkwaOne', 'active', null, null, null, null, now())
  on conflict (seller_id) do update
     set plan = 'premium', shop_name = 'Boutique AkwaOne', status = 'active',
         stripe_subscription_id = null, current_period_end = null, updated_at = now();

  raise notice 'Compte % : vendeur, boutique officielle AkwaOne, formule Premium offerte.', boutique_email;
end;
$$;
