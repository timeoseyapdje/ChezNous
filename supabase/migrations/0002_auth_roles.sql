-- Chez Nous — comptes et rôles décidés côté serveur.
-- À exécuter après 0001_init.sql dans l'éditeur SQL Supabase.

-- Chaque inscription crée son profil, toujours en « buyer » : le rôle envoyé par le navigateur est ignoré.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'buyer');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Un utilisateur peut modifier son nom ou sa ville, jamais son propre rôle.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and coalesce(current_setting('cheznous.role_change_allowed', true), '') <> 'on'
     and not public.is_admin() then
    raise exception 'Seul un administrateur peut changer un rôle';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Devenir vendeur est ouvert à tous les comptes ; passer administrateur ne l'est pas.
create or replace function public.become_seller()
returns user_role
language plpgsql
security definer set search_path = public
as $$
declare
  resulting_role user_role;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  perform set_config('cheznous.role_change_allowed', 'on', true);
  update public.profiles set role = 'seller'
    where id = auth.uid() and role = 'buyer';
  select role into resulting_role from public.profiles where id = auth.uid();
  return resulting_role;
end;
$$;

revoke all on function public.become_seller() from public, anon;
grant execute on function public.become_seller() to authenticated;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles" on public.profiles
  for update using (public.is_admin());

drop policy if exists "Admins can read all orders" on public.orders;
create policy "Admins can read all orders" on public.orders
  for select using (public.is_admin());

-- Les comptes créés avant ce script n'ont pas encore de profil.
insert into public.profiles (id, full_name, role)
select u.id, nullif(trim(u.raw_user_meta_data->>'full_name'), ''), 'buyer'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
