-- Chez Nous — initial schema
-- Run via `supabase db push` once the project is linked, or paste into the
-- Supabase SQL editor. Region: choose a Canadian region at project creation
-- to satisfy LPRPDE data-residency guidance from the devis.

create type user_role as enum ('buyer', 'seller', 'admin');
create type listing_type as enum ('produit', 'service');
create type order_status as enum ('en_attente', 'confirmee', 'terminee', 'annulee', 'remboursee');
create type seller_plan as enum ('basique', 'pro', 'premium');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'buyer',
  city text,
  created_at timestamptz not null default now()
);

create table sellers (
  id uuid primary key references profiles(id) on delete cascade,
  shop_name text not null,
  category text not null,
  city text not null,
  plan seller_plan not null default 'basique',
  stripe_account_id text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  type listing_type not null,
  category text not null,
  name text not null,
  description text,
  price_cad numeric(10,2) not null,
  cover_url text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references sellers(id),
  listing_id uuid references listings(id),
  amount_cad numeric(10,2) not null,
  status order_status not null default 'en_attente',
  stripe_session_id text,
  stripe_charge_id text,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id),
  recipient_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table sellers enable row level security;
alter table listings enable row level security;
alter table orders enable row level security;
alter table reviews enable row level security;
alter table messages enable row level security;

create policy "Profiles are viewable by owner" on profiles for select using (auth.uid() = id);
create policy "Listings are public" on listings for select using (true);
create policy "Orders are viewable by buyer or seller" on orders
  for select using (auth.uid() = buyer_id or auth.uid() = (select id from sellers where id = seller_id));
create policy "Messages are viewable by participants" on messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- TODO before production: add insert/update/delete policies per role,
-- an admin bypass policy, and indexes on listings(category, city) and
-- orders(buyer_id), orders(seller_id) once query patterns are confirmed.
