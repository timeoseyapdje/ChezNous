-- AkwaOne — compte officiel de la boutique AkwaOne, avec la formule vendeur Premium offerte (sans Stripe).
-- Remplacez le mot de passe ci-dessous, puis exécutez ce script dans l'éditeur SQL Supabase.
-- Le script crée le compte s'il n'existe pas encore (adresse déjà confirmée, connexion immédiate possible),
-- le passe administrateur et lui attribue la formule Premium. Il est idempotent : le relancer ne crée pas de doublon
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
