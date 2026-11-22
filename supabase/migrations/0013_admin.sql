-- AkwaOne — espace administrateur réel (cahier des charges 3.8) :
-- suspension / réactivation des vendeurs, signalements et modération, litiges du séquestre, journal des actions admin.
-- À exécuter après 0012_avatars_themes.sql dans l'éditeur SQL Supabase. Rejouable.
-- Les actions d'administration passent par le serveur (api/moderation.js, clé service_role) après vérification du rôle admin.

-- ===== Statut vendeur : actif ou suspendu =====
alter table public.profiles add column if not exists seller_status text not null default 'active';
alter table public.profiles drop constraint if exists profiles_seller_status_check;
alter table public.profiles add constraint profiles_seller_status_check check (seller_status in ('active', 'suspended'));
alter table public.profiles add column if not exists seller_status_note text;
alter table public.profiles add column if not exists seller_status_at timestamptz;

-- Un membre ne peut jamais changer lui-même son statut vendeur (seul le serveur ou un admin le peut).
create or replace function public.prevent_seller_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.seller_status is distinct from old.seller_status
      or new.seller_status_note is distinct from old.seller_status_note
      or new.seller_status_at is distinct from old.seller_status_at)
     and nullif(current_setting('request.jwt.claims', true), '') is not null
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'Seul un administrateur peut suspendre ou réactiver un vendeur';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_prevent_seller_status_change on public.profiles;
create trigger profiles_prevent_seller_status_change
  before update on public.profiles
  for each row execute function public.prevent_seller_status_change();

-- Vendeur suspendu : il ne peut plus publier ni modifier d'annonce (is_seller devient faux)…
create or replace function public.is_seller()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('seller', 'admin') and (role = 'admin' or seller_status = 'active')
  );
$$;

-- …et ses annonces disparaissent du site public (il les voit encore, l'admin aussi).
drop policy if exists "Active listings are public" on public.listings;
create policy "Active listings are public" on public.listings
  for select using (
    (active and not exists (
      select 1 from public.profiles p where p.id = listings.seller_id and p.seller_status = 'suspended'
    ))
    or auth.uid() = seller_id
    or public.is_admin()
  );

-- ===== Journal des actions d'administration =====
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,             -- suspend_seller, reactivate_seller, report_approved, report_removed, dispute_buyer, dispute_seller
  target_type text not null,        -- seller, listing, message, review, order
  target_id text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
alter table public.admin_audit enable row level security;
drop policy if exists "Admins read the audit log" on public.admin_audit;
create policy "Admins read the audit log" on public.admin_audit for select using (public.is_admin());

-- ===== Signalements (file de modération) =====
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'message', 'review')),
  target_id text not null,
  reason text not null check (length(reason) between 3 and 500),
  excerpt text,                     -- extrait du contenu signalé, copié par le serveur
  status text not null default 'pending' check (status in ('pending', 'approved', 'removed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
-- Un même membre ne signale qu'une fois le même contenu.
create unique index if not exists reports_once_per_member on public.reports (reporter_id, target_type, target_id);
alter table public.reports enable row level security;
drop policy if exists "Members read their reports" on public.reports;
create policy "Members read their reports" on public.reports
  for select using (auth.uid() = reporter_id or public.is_admin());
-- Création et traitement uniquement par le serveur (api/moderation.js).

-- ===== Litiges du séquestre =====
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique references public.orders(order_number) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  buyer_evidence text not null,
  seller_evidence text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  decision text check (decision in ('buyer', 'seller')),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists disputes_status_idx on public.disputes (status, created_at desc);
alter table public.disputes enable row level security;
drop policy if exists "Parties read their disputes" on public.disputes;
create policy "Parties read their disputes" on public.disputes
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id or public.is_admin());
-- Ouverture, réponse du vendeur et décision uniquement par le serveur (api/moderation.js).
