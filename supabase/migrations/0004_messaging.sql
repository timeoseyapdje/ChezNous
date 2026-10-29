-- Chez Nous — messagerie entre membres, stockée dans Supabase.
-- À exécuter après 0003_orders.sql.

alter table public.messages add column if not exists read_at timestamptz;

alter table public.messages drop constraint if exists messages_body_length;
alter table public.messages add constraint messages_body_length check (char_length(trim(body)) between 1 and 2000);
alter table public.messages drop constraint if exists messages_not_self;
alter table public.messages add constraint messages_not_self check (sender_id <> recipient_id);

create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);

-- Lecture : déjà limitée aux participants par 0001. Écriture : on n'envoie qu'en son propre nom, jamais « déjà lu ».
drop policy if exists "Members send their own messages" on public.messages;
create policy "Members send their own messages" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and read_at is null);
-- Pas de politique update/delete : un message envoyé ne se modifie pas, et « lu » passe par mark_conversation_read().

create or replace function public.mark_conversation_read(partner uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = partner and read_at is null;
$$;

-- Les profils restent privés : on ne révèle un membre que si l'on connaît déjà son courriel exact.
create or replace function public.find_member_by_email(member_email text)
returns table (id uuid, full_name text)
language sql
stable
security definer set search_path = public
as $$
  select p.id, coalesce(nullif(p.full_name, ''), split_part(u.email, '@', 1))
  from auth.users u
  join public.profiles p on p.id = u.id
  where auth.uid() is not null
    and lower(u.email) = lower(trim(member_email))
    and u.id <> auth.uid();
$$;

create or replace function public.member_name(member uuid)
returns text
language sql
stable
security definer set search_path = public
as $$
  select coalesce(nullif(p.full_name, ''), 'Membre')
  from public.profiles p
  where auth.uid() is not null and p.id = member and p.id <> auth.uid();
$$;

-- Une ligne par interlocuteur : dernier message et nombre de messages non lus reçus de lui.
create or replace function public.my_conversations()
returns table (partner_id uuid, partner_name text, last_body text, last_from_me boolean, last_at timestamptz, unread bigint)
language sql
stable
security definer set search_path = public
as $$
  with mine as (
    select m.*, case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as partner
    from public.messages m
    where auth.uid() is not null and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
  ),
  latest as (
    select distinct on (partner) partner, body, sender_id = auth.uid() as from_me, created_at
    from mine
    order by partner, created_at desc
  )
  select l.partner,
         coalesce(nullif(p.full_name, ''), 'Membre'),
         l.body,
         l.from_me,
         l.created_at,
         (select count(*) from mine x where x.partner = l.partner and x.recipient_id = auth.uid() and x.read_at is null)
  from latest l
  left join public.profiles p on p.id = l.partner
  order by l.created_at desc;
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.find_member_by_email(text) from public, anon;
revoke all on function public.member_name(uuid) from public, anon;
revoke all on function public.my_conversations() from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.find_member_by_email(text) to authenticated;
grant execute on function public.member_name(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;

-- Les nouveaux messages arrivent en direct (Supabase Realtime applique la même RLS que les lectures).
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object or undefined_object then null;
end;
$$;
