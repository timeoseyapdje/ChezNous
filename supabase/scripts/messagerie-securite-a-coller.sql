-- AkwaOne — À COLLER dans l'éditeur SQL Supabase : migration 0015 (messagerie : supprimer, bloquer, signaler une discussion ; profil public des vendeurs).
-- À exécuter après avis-notifications-versements-a-coller.sql (migration 0014).

-- AkwaOne — messagerie : supprimer une discussion, bloquer un membre, signaler une discussion, profil public des vendeurs.
-- À exécuter après 0014_reviews_notifications_payouts.sql dans l'éditeur SQL Supabase. Rejouable.

-- ===== Supprimer une discussion (pour soi seulement) =====
-- Les messages ne sont pas effacés : la discussion disparaît de sa liste (elle revient si l'autre membre réécrit),
-- et l'équipe AkwaOne peut toujours examiner une discussion signalée, même supprimée.
create table if not exists public.conversation_hidden (
  user_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, partner_id)
);
alter table public.conversation_hidden enable row level security;
drop policy if exists "Members manage their hidden conversations" on public.conversation_hidden;
create policy "Members manage their hidden conversations" on public.conversation_hidden
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== Bloquer un membre =====
create table if not exists public.member_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.member_blocks enable row level security;
drop policy if exists "Members manage their blocks" on public.member_blocks;
create policy "Members manage their blocks" on public.member_blocks
  for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Aucun message ne passe entre deux membres dont l'un a bloqué l'autre.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.member_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

drop policy if exists "Members send their own messages" on public.messages;
create policy "Members send their own messages" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and read_at is null and not public.is_blocked_between(sender_id, recipient_id));

-- Liste des conversations : sans les discussions supprimées (sauf nouveau message depuis), avec l'état du blocage.
drop function if exists public.my_conversations();
create or replace function public.my_conversations()
returns table (partner_id uuid, partner_name text, last_body text, last_from_me boolean, last_at timestamptz, unread bigint,
               blocked_by_me boolean, blocked_me boolean)
language sql
stable
security definer set search_path = public
as $$
  with mine as (
    select m.*, case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as partner
    from public.messages m
    where auth.uid() is not null and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
  ),
  visible as (
    select x.* from mine x
    left join public.conversation_hidden h on h.user_id = auth.uid() and h.partner_id = x.partner
    where h.hidden_at is null or x.created_at > h.hidden_at
  ),
  latest as (
    select distinct on (partner) partner, body, sender_id = auth.uid() as from_me, created_at
    from visible
    order by partner, created_at desc
  )
  select l.partner,
         coalesce(nullif(p.full_name, ''), 'Membre'),
         l.body,
         l.from_me,
         l.created_at,
         (select count(*) from visible x where x.partner = l.partner and x.recipient_id = auth.uid() and x.read_at is null),
         exists (select 1 from public.member_blocks b where b.blocker_id = auth.uid() and b.blocked_id = l.partner),
         exists (select 1 from public.member_blocks b where b.blocker_id = l.partner and b.blocked_id = auth.uid())
  from latest l
  left join public.profiles p on p.id = l.partner
  order by l.created_at desc;
$$;
revoke all on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- ===== Signaler une discussion entière =====
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('listing', 'message', 'review', 'conversation'));
-- Pour une discussion : target_id = identifiant du membre signalé ; le serveur garde le signaleur dans reporter_id.

-- ===== Profil public d'un membre (page vendeur, nom cliquable dans la messagerie) =====
-- Uniquement des informations publiques : nom ou boutique, ville, photo, note, date d'inscription. Jamais le courriel.
create or replace function public.public_profile(member uuid)
returns table (id uuid, display_name text, shop_name text, city text, avatar_url text, is_seller boolean, is_official boolean,
               rating numeric, reviews int, member_since timestamptz)
language sql
stable
security definer set search_path = public
as $$
  select p.id,
         coalesce(nullif(p.full_name, ''), 'Membre'),
         sp.shop_name,
         p.city,
         p.avatar_url,
         p.role in ('seller', 'admin') and coalesce(p.seller_status, 'active') = 'active',
         exists (select 1 from public.official_shops o where o.seller_id = p.id),
         r.rating,
         coalesce(r.reviews, 0),
         p.created_at
  from public.profiles p
  left join public.seller_plans sp on sp.seller_id = p.id
  left join public.seller_ratings r on r.seller_id = p.id
  where p.id = member;
$$;
revoke all on function public.public_profile(uuid) from public;
grant execute on function public.public_profile(uuid) to anon, authenticated;
