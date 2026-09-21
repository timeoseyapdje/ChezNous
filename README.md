# Chez Nous — application Next.js

Marketplace de la diaspora africaine au Canada. Ce dépôt est le point de
départ réel de la plateforme décrite dans le devis technique (Next.js +
Vercel + Supabase + Stripe Connect + IA). Toutes les clés secrètes restent
côté serveur (variables d'environnement) — aucune n'est jamais exposée au
navigateur.

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis remplir les vraies clés
npm run dev
```

## Correspondance avec le devis

| Ligne du devis | Où c'est câblé dans le code |
|---|---|
| Vercel (hébergement) | Déployer ce dépôt directement sur Vercel — aucune config supplémentaire requise. |
| Supabase (DB + auth + storage) | `lib/supabase/client.ts`, `lib/supabase/server.ts`, schéma dans `supabase/migrations/0001_init.sql`. |
| Stripe Connect (paiements marketplace) | `lib/stripe.ts`, `app/api/checkout/route.ts` (paiement avec commission plateforme via `application_fee_amount`), `app/api/stripe/webhook/route.ts`. |
| Claude API (chatbot, modération) | `lib/anthropic.ts`, `app/api/chat/route.ts`, filtre de mots-clés dans `lib/moderation.ts` en première ligne de défense avant l'appel API. |
| Resend (emails transactionnels) | `lib/resend.ts`, `app/api/contact/route.ts`. |
| Twilio (SMS, optionnel) | Non câblé — ajouter `lib/twilio.ts` sur le même modèle que `lib/resend.ts` quand ce canal sera activé. |
| Google Maps API | Non câblé — prévoir un composant carte côté client utilisant `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (déjà dans `.env.example`) pour la localisation des vendeurs. |
| Cloudinary / UploadThing | Non câblé — prévoir une route d'upload signée côté serveur avant d'exposer un widget d'upload client. |
| Sentry (monitoring) | Non câblé — `npx @sentry/wizard@latest -i nextjs` une fois `NEXT_PUBLIC_SENTRY_DSN` disponible. |

## Ce qui est déjà fonctionnel

- Structure Next.js 14 (App Router) + TypeScript + Tailwind, mêmes tokens de
  design (vert forêt, encre, corail) que la démo statique.
- En-tête, pied de page, page d'accueil avec catégories.
- Widget de chat (`components/chat-widget.tsx`) qui appelle réellement
  `/api/chat`, lequel appelle l'API Claude côté serveur.
- Modération par mots-clés (`lib/moderation.ts`) appliquée avant tout appel
  IA ou envoi de courriel.
- Schéma Supabase de départ (profils, vendeurs, annonces, commandes, avis,
  messages) avec Row Level Security activée.

## Ce qu'il reste à faire

- Pages marketplace, fiche produit, panier, tableau de bord acheteur/vendeur
  et authentification (actuellement seule la page d'accueil est portée
  depuis la démo statique `chez-nous/`).
- Onboarding Stripe Connect (`/api/connect/onboard`) pour que chaque vendeur
  obtienne un `stripe_account_id` avant de pouvoir recevoir des paiements.
- Politiques RLS Supabase complètes (insert/update/delete par rôle).
- Brancher Twilio, Google Maps, Cloudinary et Sentry quand ces clés seront
  disponibles.

## Sécurité des clés

Toutes les clés secrètes (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`) ne sont lues que
dans du code serveur (`app/api/**/route.ts`, `lib/**`) et ne doivent jamais
recevoir le préfixe `NEXT_PUBLIC_`. Seules les clés publiques (Supabase anon
key, Stripe publishable key, Google Maps key) portent ce préfixe et peuvent
être vues dans le navigateur.
