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
