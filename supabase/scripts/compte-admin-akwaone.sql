-- AkwaOne — compte administrateur (espace admin du tableau de bord).
-- Remplacez l'adresse et le mot de passe ci-dessous DANS L'ÉDITEUR SQL SUPABASE (jamais dans ce fichier), puis exécutez.
-- Le script crée le compte s'il n'existe pas (adresse confirmée, connexion immédiate) puis lui donne le rôle admin.
-- Si le compte existe déjà (créé sur le site), il le passe simplement admin : le mot de passe n'est pas modifié.
-- Rejouable sans risque.

do $$
declare
  admin_email    text := 'admin@akwaone.ca';            -- ← adresse du compte administrateur
  admin_password text := 'METTRE_LE_MOT_DE_PASSE_ICI';  -- ← utilisé seulement si le compte n'existe pas encore (12 caractères minimum)
  admin_id uuid;
begin
  select id into admin_id from auth.users where lower(email) = lower(admin_email);

  if admin_id is null then
    if admin_password = 'METTRE_LE_MOT_DE_PASSE_ICI' or length(admin_password) < 12 then
      raise exception 'Remplacez le mot de passe (12 caractères minimum) avant d''exécuter le script.';
    end if;
    admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      admin_email, extensions.crypt(admin_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Administration AkwaOne"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), admin_id, admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', admin_email, 'email_verified', true),
      'email', now(), now(), now()
    );
    raise notice 'Compte % créé.', admin_email;
  else
    raise notice 'Compte % déjà existant : mot de passe inchangé.', admin_email;
  end if;

  insert into public.profiles (id, full_name, role)
  values (admin_id, 'Administration AkwaOne', 'buyer')
  on conflict (id) do nothing;

  -- Rôle administrateur. Depuis l'éditeur SQL (sans jeton), le déclencheur anti-escalade laisse passer ce changement.
  update public.profiles set role = 'admin' where id = admin_id;

  raise notice 'Compte % : administrateur. Activez l''A2F dans Paramètres → Sécurité après la première connexion.', admin_email;
end;
$$;
