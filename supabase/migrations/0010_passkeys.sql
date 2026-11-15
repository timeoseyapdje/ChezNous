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
