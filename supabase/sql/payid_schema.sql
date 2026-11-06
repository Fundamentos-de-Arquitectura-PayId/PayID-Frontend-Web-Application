-- PayID Supabase schema. Run once in Supabase Dashboard > SQL Editor.
-- This script contains no service-role credentials. All client access is protected by RLS.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  dni text,
  birth_date date,
  segment text not null default 'family' check (segment in ('family', 'student')),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relationship text not null,
  document_type text not null default 'DNI',
  document_number text not null,
  birth_date date,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, document_type, document_number)
);

create table if not exists public.payment_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_member_id uuid,
  brand text not null default 'PayID',
  last_four char(4) not null,
  expiry_month smallint check (expiry_month between 1 and 12),
  expiry_year smallint check (expiry_year between 2020 and 2200),
  balance numeric(12,2) not null default 0 check (balance >= 0),
  is_demo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint payment_cards_member_owner_fk foreign key (family_member_id, user_id)
    references public.family_members(id, user_id) on delete set null (family_member_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_member_id uuid,
  document_type text not null,
  document_number text not null,
  full_name text not null default '',
  issue_date date,
  expiration_date date,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'expired')),
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_member_owner_fk foreign key (family_member_id, user_id)
    references public.family_members(id, user_id) on delete set null (family_member_id)
);

create table if not exists public.transport_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_member_id uuid,
  operator text not null,
  card_number text not null,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  last_recharge_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transport_cards_member_owner_fk foreign key (family_member_id, user_id)
    references public.family_members(id, user_id) on delete set null (family_member_id),
  unique (user_id, operator, card_number)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_member_id uuid,
  payment_card_id uuid references public.payment_cards(id) on delete set null,
  service text not null,
  category text not null default 'Otros',
  description text not null default '',
  method text not null default 'Tarjeta PayID',
  amount numeric(12,2) not null check (amount >= 0),
  occurred_at timestamptz not null default now(),
  status text not null default 'registered' check (status in ('registered', 'pending', 'paid', 'failed', 'simulated')),
  reference text not null,
  created_at timestamptz not null default now(),
  constraint payments_member_owner_fk foreign key (family_member_id, user_id)
    references public.family_members(id, user_id) on delete set null,
  unique (user_id, reference)
);

create table if not exists public.transport_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transport_card_id uuid not null references public.transport_cards(id) on delete cascade,
  payment_card_id uuid references public.payment_cards(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'simulated' check (status in ('pending', 'completed', 'failed', 'simulated')),
  reference text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system' check (type in ('system', 'movement', 'reminder', 'security')),
  title text not null,
  message text not null default '',
  is_read boolean not null default false,
  source_activity_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('payment', 'document', 'transport', 'notification', 'profile', 'family', 'system')),
  title text not null,
  detail text not null default '',
  status text not null default 'registered',
  reference text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.student_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  education_type text not null default 'Universidad',
  institution text not null,
  program text not null,
  student_code text not null,
  campus text not null default '',
  academic_period text not null default '',
  valid_until date,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  updated_at timestamptz not null default now()
);

create index if not exists family_members_user_created_idx on public.family_members (user_id, created_at desc);
create index if not exists payment_cards_user_created_idx on public.payment_cards (user_id, created_at desc);
create index if not exists documents_user_created_idx on public.documents (user_id, created_at desc);
create index if not exists documents_user_expiration_idx on public.documents (user_id, expiration_date);
create index if not exists transport_cards_user_created_idx on public.transport_cards (user_id, created_at desc);
create index if not exists payments_user_date_idx on public.payments (user_id, occurred_at desc);
create index if not exists transport_transactions_user_date_idx on public.transport_transactions (user_id, created_at desc);
create index if not exists notifications_user_date_idx on public.notifications (user_id, created_at desc);
create index if not exists activity_events_user_date_idx on public.activity_events (user_id, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.payment_cards enable row level security;
alter table public.documents enable row level security;
alter table public.transport_cards enable row level security;
alter table public.payments enable row level security;
alter table public.transport_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_events enable row level security;
alter table public.student_credentials enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert on public.payment_cards to authenticated;
revoke update, delete on public.payment_cards from authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.transport_cards to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert on public.transport_transactions to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert on public.activity_events to authenticated;
grant select, insert, update on public.student_credentials to authenticated;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists family_members_owner_all on public.family_members;
create policy family_members_owner_all on public.family_members for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists payment_cards_owner_all on public.payment_cards;
drop policy if exists payment_cards_owner_read on public.payment_cards;
create policy payment_cards_owner_read on public.payment_cards for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists payment_cards_owner_insert_demo on public.payment_cards;
create policy payment_cards_owner_insert_demo on public.payment_cards for insert to authenticated
  with check (user_id = (select auth.uid()) and is_demo = true and balance = 0);
drop policy if exists documents_owner_all on public.documents;
create policy documents_owner_all on public.documents for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists transport_cards_owner_all on public.transport_cards;
create policy transport_cards_owner_all on public.transport_cards for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists payments_owner_all on public.payments;
create policy payments_owner_all on public.payments for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists transport_transactions_owner_read on public.transport_transactions;
create policy transport_transactions_owner_read on public.transport_transactions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists transport_transactions_owner_insert on public.transport_transactions;
create policy transport_transactions_owner_insert on public.transport_transactions for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists notifications_owner_all on public.notifications;
create policy notifications_owner_all on public.notifications for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists activity_events_owner_select on public.activity_events;
create policy activity_events_owner_select on public.activity_events for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists activity_events_owner_insert on public.activity_events;
create policy activity_events_owner_insert on public.activity_events for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists student_credentials_owner_all on public.student_credentials;
create policy student_credentials_owner_all on public.student_credentials for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.payid_sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, dni, birth_date, segment)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'dni', ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'fechaNacimiento', ''), 10), '')::date,
    case when new.raw_user_meta_data ->> 'segmento' = 'student' then 'student' else 'family' end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    dni = coalesce(excluded.dni, public.profiles.dni),
    birth_date = coalesce(excluded.birth_date, public.profiles.birth_date),
    segment = excluded.segment,
    updated_at = now();
  return new;
end;
$$;

revoke all on function public.payid_sync_auth_profile() from public, anon, authenticated;
grant execute on function public.payid_sync_auth_profile() to supabase_auth_admin;
drop trigger if exists payid_auth_user_profile on auth.users;
create trigger payid_auth_user_profile
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.payid_sync_auth_profile();

-- Backfill accounts created before this schema was installed. Safe to rerun.
insert into public.profiles (id, email, full_name, dni, birth_date, segment)
select
  users.id,
  coalesce(users.email, ''),
  coalesce(users.raw_user_meta_data ->> 'nombre', split_part(coalesce(users.email, ''), '@', 1)),
  nullif(users.raw_user_meta_data ->> 'dni', ''),
  nullif(left(coalesce(users.raw_user_meta_data ->> 'fechaNacimiento', ''), 10), '')::date,
  case when users.raw_user_meta_data ->> 'segmento' = 'student' then 'student' else 'family' end
from auth.users as users
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  dni = coalesce(excluded.dni, public.profiles.dni),
  birth_date = coalesce(excluded.birth_date, public.profiles.birth_date),
  segment = excluded.segment,
  updated_at = now();

-- A top-up is one atomic database transaction. It only changes demo balances; it is not a real charge.
create or replace function public.payid_recharge_transport(
  p_transport_card_id uuid,
  p_payment_card_id uuid,
  p_amount numeric
)
returns public.transport_transactions
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transport_card public.transport_cards%rowtype;
  v_transaction public.transport_transactions%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000 then raise exception 'Invalid recharge amount'; end if;

  -- Demo cards are read-only; do not request a row lock, which requires UPDATE privileges.
  perform 1 from public.payment_cards where id = p_payment_card_id and user_id = v_user_id and is_demo = true;
  if not found then raise exception 'Payment card not found'; end if;

  select * into v_transport_card from public.transport_cards
    where id = p_transport_card_id and user_id = v_user_id for update;
  if not found then raise exception 'Transport card not found'; end if;

  update public.transport_cards set balance = balance + p_amount, last_recharge_at = now() where id = v_transport_card.id;
  insert into public.transport_transactions (user_id, transport_card_id, payment_card_id, amount, status, reference)
    values (v_user_id, v_transport_card.id, p_payment_card_id, p_amount, 'simulated', gen_random_uuid()::text)
    returning * into v_transaction;
  return v_transaction;
end;
$$;

revoke all on function public.payid_recharge_transport(uuid, uuid, numeric) from public, anon;
grant execute on function public.payid_recharge_transport(uuid, uuid, numeric) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payid-documents', 'payid-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('payid-profile-photos', 'payid-profile-photos', false, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payid_document_files_read_own on storage.objects;
create policy payid_document_files_read_own on storage.objects for select to authenticated
  using (bucket_id = 'payid-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists payid_document_files_insert_own on storage.objects;
create policy payid_document_files_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'payid-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists payid_document_files_update_own on storage.objects;
create policy payid_document_files_update_own on storage.objects for update to authenticated
  using (bucket_id = 'payid-documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'payid-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists payid_document_files_delete_own on storage.objects;
create policy payid_document_files_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'payid-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists payid_profile_photos_read_own on storage.objects;
create policy payid_profile_photos_read_own on storage.objects for select to authenticated
  using (bucket_id = 'payid-profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists payid_profile_photos_insert_own on storage.objects;
create policy payid_profile_photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'payid-profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists payid_profile_photos_update_own on storage.objects;
create policy payid_profile_photos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'payid-profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'payid-profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists payid_profile_photos_delete_own on storage.objects;
create policy payid_profile_photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'payid-profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
