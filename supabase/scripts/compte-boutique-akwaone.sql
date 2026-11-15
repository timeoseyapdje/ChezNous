-- AkwaOne — compte officiel de la boutique AkwaOne, avec la formule vendeur Premium offerte (sans Stripe).
-- 1. Créez d'abord le compte normalement sur le site (page Connexion → Créer un compte) avec l'adresse choisie.
-- 2. Remplacez l'adresse ci-dessous, puis exécutez ce script dans l'éditeur SQL Supabase.
-- Le script est idempotent : le relancer ne crée pas de doublon.

do $$
declare
  boutique_email text := 'boutique@akwaone.ca';  -- ← adresse du compte créé à l'étape 1
  boutique_id uuid;
begin
  select id into boutique_id from auth.users where lower(email) = lower(boutique_email);
  if boutique_id is null then
    raise exception 'Aucun compte avec l''adresse %. Créez-le d''abord sur le site.', boutique_email;
  end if;

  -- Administrateur : seul ce rôle publie les produits de la Boutique AkwaOne (channel = 'boutique').
  -- Il peut aussi basculer sur la vue Vendeur depuis le sélecteur de rôle du tableau de bord.
  update public.profiles
     set role = 'admin', full_name = coalesce(full_name, 'Boutique AkwaOne')
   where id = boutique_id;

  -- Formule Premium active, sans abonnement Stripe ni date de fin : elle n'expire pas et n'est jamais facturée.
  insert into public.seller_plans (seller_id, plan, shop_name, status, stripe_customer_id, stripe_subscription_id, stripe_session_id, current_period_end, updated_at)
  values (boutique_id, 'premium', 'Boutique AkwaOne', 'active', null, null, null, null, now())
  on conflict (seller_id) do update
     set plan = 'premium', shop_name = 'Boutique AkwaOne', status = 'active',
         stripe_subscription_id = null, current_period_end = null, updated_at = now();

  raise notice 'Compte % : administrateur + formule Premium offerte.', boutique_email;
end;
$$;
