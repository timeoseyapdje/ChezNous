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
